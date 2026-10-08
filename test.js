// End-to-end API test script
const BASE = "http://localhost:3000/api";

async function request(method, path, body = null, token = null) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (token) opts.headers["Authorization"] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json();
  return { status: res.status, data };
}

function assert(condition, label) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${label}`);
    process.exitCode = 1;
  } else {
    console.log(`  ✅ PASS: ${label}`);
  }
}

async function run() {
  let token;

  console.log("\n🔐 AUTH TESTS\n");

  // 1. Register
  let r = await request("POST", "/auth/register", {
    username: "testuser",
    email: "test@example.com",
    password: "password123",
  });
  assert(r.status === 201, `Register → 201 (got ${r.status})`);
  assert(r.data.user.username === "testuser", "Register returns user");

  // 2. Register duplicate
  r = await request("POST", "/auth/register", {
    username: "testuser",
    email: "test@example.com",
    password: "password123",
  });
  assert(r.status === 400, `Duplicate register → 400 (got ${r.status})`);

  // 3. Register validation
  r = await request("POST", "/auth/register", {
    username: "ab",
    email: "not-an-email",
    password: "12",
  });
  assert(r.status === 400, `Invalid register → 400 (got ${r.status})`);
  assert(r.data.details.length >= 2, "Multiple validation errors returned");

  // 4. Login
  r = await request("POST", "/auth/login", {
    email: "test@example.com",
    password: "password123",
  });
  assert(r.status === 200, `Login → 200 (got ${r.status})`);
  assert(typeof r.data.token === "string", "Login returns JWT token");
  token = r.data.token;

  // 5. Login wrong password
  r = await request("POST", "/auth/login", {
    email: "test@example.com",
    password: "wrongpassword",
  });
  assert(r.status === 401, `Wrong password → 401 (got ${r.status})`);

  // 6. Get profile
  r = await request("GET", "/auth/me", null, token);
  assert(r.status === 200, `Get profile → 200 (got ${r.status})`);
  assert(r.data.user.email === "test@example.com", "Profile returns correct email");

  // 7. Unauthenticated access
  r = await request("GET", "/auth/me");
  assert(r.status === 401, `Unauthed /me → 401 (got ${r.status})`);

  console.log("\n📋 TASK CRUD TESTS\n");

  // 8. Create task
  r = await request("POST", "/tasks", { title: "Test Task 1", priority: "high" }, token);
  assert(r.status === 201, `Create task → 201 (got ${r.status})`);
  assert(r.data.task.title === "Test Task 1", "Task has correct title");
  assert(r.data.task.priority === "high", "Task has correct priority");
  assert(r.data.task.status === "pending", "Default status is pending");
  const taskId = r.data.task.id;

  // 9. Create task without auth
  r = await request("POST", "/tasks", { title: "No Auth" });
  assert(r.status === 401, `Create task no auth → 401 (got ${r.status})`);

  // 10. Create task bad validation
  r = await request("POST", "/tasks", { title: "", status: "invalid" }, token);
  assert(r.status === 400, `Create task bad data → 400 (got ${r.status})`);

  // 11. Create second task
  r = await request("POST", "/tasks", { title: "Test Task 2", status: "in_progress", description: "Some work" }, token);
  assert(r.status === 201, `Create second task → 201 (got ${r.status})`);

  // 12. List tasks
  r = await request("GET", "/tasks", null, token);
  assert(r.status === 200, `List tasks → 200 (got ${r.status})`);
  assert(r.data.tasks.length === 2, `List returns 2 tasks (got ${r.data.tasks.length})`);
  assert(r.data.pagination.total === 2, "Pagination total = 2");

  // 13. Filter tasks
  r = await request("GET", "/tasks?status=pending", null, token);
  assert(r.status === 200, `Filter by status → 200 (got ${r.status})`);
  assert(r.data.tasks.length === 1, `Filter returns 1 task (got ${r.data.tasks.length})`);

  // 14. Search tasks
  r = await request("GET", "/tasks?search=Some", null, token);
  assert(r.status === 200, `Search → 200 (got ${r.status})`);
  assert(r.data.tasks.length === 1, `Search returns 1 task (got ${r.data.tasks.length})`);

  // 15. Get task by ID
  r = await request("GET", `/tasks/${taskId}`, null, token);
  assert(r.status === 200, `Get task by ID → 200 (got ${r.status})`);
  assert(r.data.task.id === taskId, "Returns correct task");

  // 16. Get non-existent task
  r = await request("GET", "/tasks/9999", null, token);
  assert(r.status === 404, `Non-existent task → 404 (got ${r.status})`);

  // 17. Update task (PUT)
  r = await request("PUT", `/tasks/${taskId}`, {
    title: "Updated Title",
    description: "Updated desc",
    status: "completed",
    priority: "low",
  }, token);
  assert(r.status === 200, `PUT update → 200 (got ${r.status})`);
  assert(r.data.task.title === "Updated Title", "Title updated");
  assert(r.data.task.status === "completed", "Status updated");

  // 18. Partial update (PATCH)
  r = await request("PATCH", `/tasks/${taskId}`, { priority: "medium" }, token);
  assert(r.status === 200, `PATCH update → 200 (got ${r.status})`);
  assert(r.data.task.priority === "medium", "Priority patched");
  assert(r.data.task.title === "Updated Title", "Other fields preserved");

  // 19. Delete task
  r = await request("DELETE", `/tasks/${taskId}`, null, token);
  assert(r.status === 200, `Delete task → 200 (got ${r.status})`);

  // 20. Verify deletion
  r = await request("GET", `/tasks/${taskId}`, null, token);
  assert(r.status === 404, `Deleted task → 404 (got ${r.status})`);

  // 21. Delete non-existent task
  r = await request("DELETE", `/tasks/${taskId}`, null, token);
  assert(r.status === 404, `Delete non-existent → 404 (got ${r.status})`);

  console.log("\n🔒 USER ISOLATION TEST\n");

  // 22. Register second user
  r = await request("POST", "/auth/register", {
    username: "otheruser",
    email: "other@example.com",
    password: "password456",
  });
  assert(r.status === 201, "Second user registered");

  r = await request("POST", "/auth/login", {
    email: "other@example.com",
    password: "password456",
  });
  const otherToken = r.data.token;

  // 23. Other user can't see first user's tasks
  r = await request("GET", "/tasks", null, otherToken);
  assert(r.data.tasks.length === 0, `Other user sees 0 tasks (got ${r.data.tasks.length})`);

  console.log("\n✨ All tests complete!\n");
}

run().catch(console.error);
