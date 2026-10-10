CREATE TABLE IF NOT EXISTS users(
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, username)
    VALUES (NEW.id, split_part(NEW.email, '@', 1));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TABLE IF NOT EXISTS posts(
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    likes INTEGER NOT NULL DEFAULT 0,
    visibility VARCHAR(20) NOT NULL DEFAULT 'public',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS friendships(
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_status CHECK (status IN ('pending', 'accepted', 'rejected')),
    CONSTRAINT no_self_friendship CHECK (user_id <> friend_id),
    CONSTRAINT unique_friendship UNIQUE (user_id, friend_id)
);

-- Logged in users can upload to the post-photos bucket
CREATE POLICY
  "Authenticated can upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'post-photos'
);

-- Anyone can view the post photos
CREATE POLICY
  "Post photos are readable"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'post-photos'
);

-- Set permissions on what anonymous and logged-in users can do with posts
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON posts TO anon, authenticated;
GRANT INSERT, DELETE ON posts TO authenticated;
GRANT USAGE ON SEQUENCE posts_id_seq TO authenticated;

-- users, posts, friendships
-- 1 user can have no or many friendships, 1 friendship needs to have at least 1 user
-- 1 user can have no or many posts, 1 post needs to have at least 1 user

-- on post visibility, have a visibility column in the posts table
-- for friend-only posts, query only the posts where visiblity is friends-only and posts from users who they are a friend of