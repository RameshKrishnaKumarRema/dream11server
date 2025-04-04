import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import pg from "pg";
import fs from "fs";
import { console } from "inspector";
import env from "dotenv";
import { dirname } from "path";
import { fileURLToPath } from "url";

const app = express();
const port = 3000;
const corsOptions = {
  origin: ["http://localhost:5173/"],
};
const __dirname = dirname(fileURLToPath(import.meta.url));

env.config();

//Middleware
app.use(cors(corsOptions));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

//Database connection
const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
  ssl: {
    rejectUnauthorized: false,
    ca: fs.readFileSync(__dirname + "/ssl/ca.pem").toString(),
  },
});

db.connect();

app.get("/", async (req, res) => {
  var sql = `select contestant.contestantid, contestant.contestantname, sum (entryamount ::numeric::int) as amountspent,sum(contest.winningamount ::numeric::int) as amountwon, sum(contest.winningamount  ::numeric::int) - sum (entryamount ::numeric::int) as Profit,
              row_number() OVER (order by sum(contest.winningamount) - sum (entryamount) desc) as Position,
              contestant.contestantphotoname as photoname
              from contest
              inner join contestant
              on contest.contestantid = contestant.contestantid
              GROUP  BY contestant.contestantid,contestant.contestantname
              order by Profit desc`;

  const result = await db.query(sql);
  console.log(result.rows);
  res.header("Access-Control-Allow-Origin", "*");
  res.json(result.rows);
});

app.listen(port, () => {
  console.log(`Server Started on port ${port}`);
});
