import express from "express";

const app = express();
const port = process.env.PORT || 4001;

app.use(express.json());

const demoUser = {
  id: "demo-user-1",
  email: "reader@example.com",
  username: "reader01",
  displayName: "Reader One",
  bio: "Tracking books and writing reviews.",
};

app.get("/health", (_req, res) => {
  res.json({ service: "user-service", status: "ok" });
});

app.post("/api/auth/register", (req, res) => {
  res.status(201).json({
    message: "Registration endpoint scaffolded.",
    user: {
      ...demoUser,
      email: req.body.email ?? demoUser.email,
      username: req.body.username ?? demoUser.username,
      displayName: req.body.displayName ?? demoUser.displayName,
    },
    token: "demo-jwt-token",
  });
});

app.post("/api/auth/login", (req, res) => {
  res.json({
    message: "Login endpoint scaffolded.",
    user: {
      ...demoUser,
      email: req.body.email ?? demoUser.email,
    },
    token: "demo-jwt-token",
  });
});

app.get("/api/users/:username", (req, res) => {
  res.json({
    profile: {
      ...demoUser,
      username: req.params.username,
      followersCount: 12,
      followingCount: 7,
    },
  });
});

app.post("/api/users/:userId/follow", (req, res) => {
  res.status(201).json({
    message: `Now following ${req.params.userId}.`,
  });
});

app.delete("/api/users/:userId/follow", (req, res) => {
  res.json({
    message: `Unfollowed ${req.params.userId}.`,
  });
});

app.get("/api/users/:userId/following", (req, res) => {
  res.json({
    userId: req.params.userId,
    following: [
      {
        id: "demo-user-2",
        username: "genrehunter",
        displayName: "Genre Hunter",
      },
    ],
  });
});

app.listen(port, () => {
  console.log(`user-service listening on port ${port}`);
});
