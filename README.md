# ![Fantasorium logo](./FantasoriumAPI.png)

The backend API for the Fantasorium site.

The Fantasorium site:
- Vercel link: https://fantasorium-frontend.vercel.app/
- GitHub repo: https://github.com/cswong235/fantasorium-frontend

## Routes

1. GET / — serves the API's landing page, which documents every route.
2. GET /health — check that the server is running. Returns `{ "status": "ok" }`.
3. POST /signup — create a new account and log it in through Supabase Auth. Body: `email`, `password`. Returns the user and a session.
4. POST /login — log in through Supabase Auth and get a session containing an `access_token` and `refresh_token`. Body: `email`, `password`.
5. GET /profile — fetch the logged-in user's id, username and join date.
6. GET /users — fetch all users except the logged-in user.
7. POST /posts — create a post as the logged-in user. Body: `title`, `content`, and optionally `visibility` (`public` or `friends_only`) and `image` (a Supabase Storage URL from the `post-photos` bucket).
8. GET /posts — fetch the posts the logged-in user can see, newest first: public posts, their own posts, and friends-only posts from authors who sent them a friend request they accepted, joined with each author's username. Optional query: `limit` and `offset` for paging, e.g. `/posts?limit=3&offset=3`.
9. POST /friendships — send a friend request, saved with a `pending` status. Body: `friend_id`.
10. GET /friendships — fetch every friendship the logged-in user is part of, whether they sent or received it.
11. PATCH /friendships/:id — accept or reject a friend request sent to the logged-in user, where `:id` is the friendship's id. Body: `status` (`accepted` or `rejected`).
12. DELETE /friendships/:id — remove a friendship whoever sent it, where `:id` is the other user's id.

Routes 5 to 12 require authentication via the `verifySession` function, which checks the Supabase access token sent in the header as `Authorization: Bearer <access_token>`.

## Other info
Built with:
- JavaScript
- Node
- Express
- PostgreSQL
- Supabase
- Supabase Auth

## Links
- Vercel link: https://fantasorium-backend.vercel.app/
