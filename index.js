import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();
const app = express();
const port = 3000;
const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: Number(process.env.PG_PORT),
});
db.connect();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

async function getBookById(id) {
  try {
    const result = await db.query("SELECT * FROM books WHERE ID=$1", [id]);
    return result.rows[0];
  } catch (err) {
    console.error("Error fetching book by ID:", err);
    return null;
  }
}
app.get("/", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM books ORDER BY date_read DESC",
    );
    const books = result.rows;
    res.render("index.ejs", { books: books });
  } catch (err) {
    console.error("Error fetching books:", err);
  }
});
app.get("/edit/:id", async (req, res) => {
  try {
    const book = await getBookById(req.params.id);
    if (!book) {
      return res.send("Book not found");
    }
    res.render("index.ejs", { book: book });
  } catch (err) {
    console.error("Error fetching book:", err);
  }
});
app.post("/add", async (req, res) => {
  const title = req.body["title"];
  const author = req.body["author"];
  const date_read = req.body["date_read"];

  try {
    const result = await axios.get(
      `https://openlibrary.org/search.json?title=${title}`,
    );
    const cover_id = result.data.docs[0]?.cover_i || null;
    await db.query(
      "INSERT INTO books (title, author, date_read, cover_id) VALUES ($1, $2, $3, $4)",
      [title, author, date_read, cover_id],
    );
    res.redirect("/");
  } catch (err) {
    console.error("Error adding book:", err);
  }
});
app.post("/edit/:id", async (req, res) => {
  const id = req.params.id;
  const title = req.body["title"];
  const author = req.body["author"];
  const rating = req.body["rating"];
  const notes = req.body["notes"];
  const date_read = req.body["date_read"];
  const currentBook = await getBookById(id);
  const title_changed = title !== currentBook.title;
  let cover_id = currentBook.cover_id;
  try {
    if (title_changed) {
      try {
        const result = await axios.get(
          `https://openlibrary.org/search.json?title=${title}`,
          { timeout: 5000 },
        );
        cover_id = result.data.docs[0]?.cover_i || null;
      } catch (err) {
        console.error("Could not fetch cover:", err);
      }
    }
    const result = await db.query(
      "UPDATE books SET title=$1, author=$2, rating=$3, notes=$4, date_read=$5, cover_id=$6 WHERE id=$7",
      [title, author, rating, notes, date_read, cover_id, id],
    );
    res.redirect("/");
  } catch (err) {
    console.error("Error updating book:", err);
  }
});
app.get("/delete/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const result = await db.query("DELETE FROM books WHERE id=$1", [id]);
    res.redirect("/");
  } catch (err) {
    console.error("Error deleting book:", err);
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
