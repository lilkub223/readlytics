import express from "express";

const app = express();
const port = process.env.PORT || 4001;

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ service: "user-service", status: "ok" });
});

app.get("/api/users", (_req, res) => {
  res.json({
    message: "User service scaffold is running.",
    nextStep: "Add auth, profiles, and follow endpoints.",
  });
});

app.listen(port, () => {
  console.log(`user-service listening on port ${port}`);
});

