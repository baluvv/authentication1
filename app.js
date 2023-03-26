const express = require("express");
const app = express();
app.use(express.json());

const bcrypt = require("bcrypt");

const path = require("path");
const dbPath = path.join(__dirname, "userData.db");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

let db = null;

const startDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

startDbAndServer();

//create User API
app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 15);

  const selectUserQuery = `
    SELECT
    * FROM user
    WHERE username= '${username}';`;

  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    if (password.length >= 5) {
      const createUserQuery = `
        INSERT INTO
        user(username, name, password, gender, location)
        VALUES
        (
            '${username}',
            '${name}',
            '${hashedPassword}',
            '${gender}',
            '${location}'
        );`;
      await db.run(createUserQuery);
      response.status(200);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    //send username already exit as response
    response.status(400);
    response.send("User already exists");
  }
});

//User Login API
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const checkingUserQuery = `
    SELECT
    *
    FROM user
    WHERE username= '${username}';`;
  const dbUser = await db.get(checkingUserQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);

    if (isPasswordMatched) {
      response.status(200);
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//Change Existing User Password

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const newHashedPassword = await bcrypt.hash(newPassword, 15);

  const selectUserQuery = `
    SELECT
    *
    FROM user
    WHERE username= '${username}';`;

  const dbUser = await db.get(selectUserQuery);

  const isPasswordMatched = await bcrypt.compare(oldPassword, dbUser.password);

  if (isPasswordMatched) {
    if (newPassword.length < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const newPasswordSetQuery = `
            UPDATE user
            SET
            password= '${newHashedPassword}'
            WHERE
            username= '${username}';`;
      await db.run(newPasswordSetQuery);
      response.status(200);
      response.send("Password updated");
    }
  } else {
    response.status(400);
    response.send("Invalid current password");
  }
});

module.exports = app;
