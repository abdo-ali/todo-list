import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;
app.set("view engine", "ejs");

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "todo",
  password: "123456",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

let users = [
  { id: 1, name: "Angela", color: "teal" },
  { id: 2, name: "Jack", color: "powderblue" },
];

let items = [
  { id: 1, title: "Buy milk" },
  { id: 2, title: "Finish homework" },
];
let currentGoal = "T";
async function fetchItems() {
  let result = await db.query(
    "SELECT * FROM items where user_id = $1 AND goal = $2 ORDER BY id asc ;",
    [currentUserId, currentGoal]
  );
  if (result.rows.length === 0) {
    // If no items are found, return the default items
    return (items = []);
  }
  // Ensure the items are in the same format as the default items
  result.rows = result.rows.map((item) => ({
    id: item.id,
    title: item.title,
    date: item.date,
  }));
  return result.rows;
}

async function getCurrentUser() {
  const result = await db.query("SELECT * FROM users");
  users = result.rows;
  return users.find((user) => user.id == currentUserId);
}

function getTime() {
  const now = new Date();

  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0"); // Month is 0-indexed
  const year = now.getFullYear();

  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  const formattedDateTime = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

  //console.log(formattedDateTime); // Example output: 13/08/2025 12:11:00
  return formattedDateTime;
}

app.get("/", async (req, res) => {
  items = await fetchItems();
  const currentUser = await getCurrentUser();
  res.render("index.ejs", {
    listTitle: "Today",
    listItems: items,
    users: users,
    color: currentUser.color,
  });
});

app.post("/add", (req, res) => {
  const item = req.body.newItem;
  const date = getTime();
  console.log(date);
  db.query(
    "INSERT INTO items (title, user_id, date, goal) VALUES ($1, $2, $3, $4)",
    [item, currentUserId, date, currentGoal]
  );
  //console.log("Item Added: ", items);
  res.redirect("/");
});

app.post("/edit", (req, res) => {
  const itemId = req.body.updatedItemId;
  const newTitle = req.body.updatedItemTitle;
  console.log("Editing item with ID:", itemId, "to new title:", newTitle);
  db.query("UPDATE items SET title = $1 WHERE id = $2", [newTitle, itemId]);
  console.log("Item Edited: ", items);
  res.redirect("/");
});

app.post("/delete", (req, res) => {
  const itemId = req.body.deleteItemId;
  db.query("DELETE FROM items WHERE id = $1", [itemId]);
  console.log("Item Deleted: ", items);
  res.redirect("/");
});

app.post("/user", async (req, res) => {
  if (req.body.add === "new") {
    res.render("new.ejs");
  } else if (req.body.delete === "delete") {
    console.log("Deleting user with ID:", currentUserId);
    await db.query("DELETE FROM items WHERE user_id = $1", [currentUserId]);
    await db.query("DELETE FROM users WHERE id = $1", [currentUserId]);
    currentUserId = 1; // Reset to default user
    currentGoal = "T"; // Reset to default goal
    console.log("User Deleted. Redirecting to home page.");
    res.redirect("/");
  } else {
    currentUserId = req.body.user;
    currentGoal = "T";
    res.redirect("/");
  }
});

app.post("/new", async (req, res) => {
  const name = req.body.name;
  const color = req.body.color;

  const result = await db.query(
    "INSERT INTO users (name, color) VALUES($1, $2) RETURNING *;",
    [name, color]
  );

  const id = result.rows[0].id;
  currentUserId = id;

  res.redirect("/");
});

app.post("/goal", async (req, res) => {
  const goal = req.body.goal;
  currentGoal = goal;
  console.log("goal is: " + goal);
  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
