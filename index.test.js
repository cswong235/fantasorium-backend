const request = require("supertest");

// Mock Supabase client auth methods to prevent it from creating actual accounts
jest.mock("./supabaseClient", () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      getUser: jest.fn(),
    },
  },
}));

// Mock database connection and pool
jest.mock("pg", () => {
  const pool = { query: jest.fn() };
  return { Pool: jest.fn(() => pool) };
});

const app = require("./index");
const { supabase } = require("./supabaseClient");
const { Pool } = require("pg");
const pool = new Pool();

// Dummy data
const USER_ID = "11111111-1111-1111-1111-111111111111";
const FRIEND_ID = "22222222-2222-2222-2222-222222222222";
const EMAIL = "tester@example.com";
const PASSWORD = "password123";
const SESSION = { access_token: "fake-access-token", refresh_token: "fake-refresh-token" };
const AUTH = { Authorization: "Bearer fake-access-token" };

beforeEach(() => {
  // Clear all mocked data
  jest.clearAllMocks();
  // Nearly all routes call verifySession so mock the session as well
  supabase.auth.getUser.mockResolvedValue({
    data: { user: { id: USER_ID, email: EMAIL } },
    error: null,
  });
});

test("GET / responds with 200", async () => {
  const res = await request(app).get("/");
  console.log("1. GET / responds with 200:", res.statusCode);
  expect(res.statusCode).toBe(200);
});

test("GET /health responds with status ok", async () => {
  const res = await request(app).get("/health");
  console.log("2. GET /health responds with status ok:", res.statusCode, res.body);
  expect(res.body.status).toBe("ok");
});

test("POST /signup creates an account and returns a session", async () => {
  supabase.auth.signUp.mockResolvedValue({
    data: { user: { id: USER_ID, email: EMAIL }, session: SESSION },
    error: null,
  });

  const res = await request(app).post("/signup").send({ email: EMAIL, password: PASSWORD });
  console.log("3. POST /signup creates an account and returns a session:", res.statusCode, res.body);

  expect(res.statusCode).toBe(201);
  expect(res.body.session.access_token).toBe("fake-access-token");
});

test("POST /login returns a session", async () => {
  supabase.auth.signInWithPassword.mockResolvedValue({
    data: { session: SESSION },
    error: null,
  });

  const res = await request(app).post("/login").send({ email: EMAIL, password: PASSWORD });
  console.log("4. POST /login returns a session:", res.statusCode, res.body);

  expect(res.statusCode).toBe(200);
  expect(res.body.session.access_token).toBe("fake-access-token");
});

test("POST /posts creates a post", async () => {
  const post = { id: 1, user_id: USER_ID, title: "Hello", content: "My first post", visibility: "public" };
  pool.query.mockResolvedValue({ rows: [post] });

  const res = await request(app)
    .post("/posts")
    .set(AUTH)
    .send({ title: "Hello", content: "My first post", visibility: "public" });
  console.log("5. POST /posts creates a post:", res.statusCode, res.body);

  expect(res.statusCode).toBe(201);
  expect(res.body.result.title).toBe("Hello");
});

test("GET /posts returns a list of posts", async () => {
  pool.query.mockResolvedValue({
    rows: [{ id: 1, title: "Hello", content: "My first post", username: "tester" }],
  });

  const res = await request(app).get("/posts").set(AUTH);
  console.log("6. GET /posts returns a list of posts:", res.statusCode, res.body);

  expect(res.statusCode).toBe(200);
  expect(res.body).toHaveLength(1);
});

test("GET /users returns other users", async () => {
  pool.query.mockResolvedValue({ rows: [{ id: FRIEND_ID, username: "friend" }] });

  const res = await request(app).get("/users").set(AUTH);
  console.log("7. GET /users returns other users:", res.statusCode, res.body);

  expect(res.statusCode).toBe(200);
  expect(res.body[0].username).toBe("friend");
});

test("GET /profile returns the logged in user", async () => {
  pool.query.mockResolvedValue({ rows: [{ id: USER_ID, username: "tester" }] });

  const res = await request(app).get("/profile").set(AUTH);
  console.log("8. GET /profile returns the logged in user:", res.statusCode, res.body);

  expect(res.statusCode).toBe(200);
  expect(res.body.username).toBe("tester");
});

test("POST /friendships sends a friend request", async () => {
  pool.query.mockResolvedValue({
    rows: [{ id: 1, user_id: USER_ID, friend_id: FRIEND_ID, status: "pending" }],
  });

  const res = await request(app).post("/friendships").set(AUTH).send({ friend_id: FRIEND_ID });
  console.log("9. POST /friendships sends a friend request:", res.statusCode, res.body);

  expect(res.statusCode).toBe(201);
  expect(res.body.result.status).toBe("pending");
});

test("GET /friendships returns the user's friendships", async () => {
  pool.query.mockResolvedValue({
    rows: [{ id: 1, user_id: USER_ID, friend_id: FRIEND_ID, status: "pending" }],
  });

  const res = await request(app).get("/friendships").set(AUTH);
  console.log("10. GET /friendships returns the user's friendships:", res.statusCode, res.body);

  expect(res.statusCode).toBe(200);
  expect(res.body[0].friend_id).toBe(FRIEND_ID);
});

test("PATCH /friendships/:id accepts a friend request", async () => {
  pool.query.mockResolvedValue({
    rows: [{ id: 1, user_id: FRIEND_ID, friend_id: USER_ID, status: "accepted" }],
  });

  const res = await request(app).patch("/friendships/1").set(AUTH).send({ status: "accepted" });
  console.log("11. PATCH /friendships/:id accepts a friend request:", res.statusCode, res.body);

  expect(res.statusCode).toBe(200);
  expect(res.body.result.status).toBe("accepted");
});

test("DELETE /friendships/:id removes a friend", async () => {
  pool.query.mockResolvedValue({
    rows: [{ id: 1, user_id: USER_ID, friend_id: FRIEND_ID }],
  });

  const res = await request(app).delete(`/friendships/${FRIEND_ID}`).set(AUTH);
  console.log("12. DELETE /friendships/:id removes a friend:", res.statusCode, res.body);

  expect(res.statusCode).toBe(200);
  expect(res.body.message).toBe("Friend removed successfully");
});
