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
  //Get Contestant Tile data
  var contestantTilesql = `select contestant.contestantid, contestant.contestantname, sum (entryamount ::numeric::int) as amountspent,sum(contest.winningamount ::numeric::int) as amountwon, sum(contest.winningamount  ::numeric::int) - sum (entryamount ::numeric::int) as Profit,
              row_number() OVER (order by sum(contest.winningamount) - sum (entryamount) desc) as Position,
              contestant.contestantphotoname as photoname
              from contest
              inner join contestant
              on contest.contestantid = contestant.contestantid
              GROUP  BY contestant.contestantid,contestant.contestantname
              order by Profit desc`;

  const contestantTileResult = await db.query(contestantTilesql);

  //Get Points Table
  var pointsTablesql = `select ROW_NUMBER() OVER () AS row_num, HomeTeam,awayteam,matchdate,"Ramesh","Abhilash","Dileep","Jayan","Lijin","Mahesh","Tressa","Suraj","Mobin" from  contest_view_IPL2025`;
  const pointsTableResult = await db.query(pointsTablesql);

  //Get Last Five Matches Result
  var lastFiveMatchessql = `SELECT contestantid,
                          STRING_AGG(position::text, ',' ORDER BY contestid DESC) AS lastfivepositions
                          FROM (SELECT contestantid, position, contestid,    
                          ROW_NUMBER() OVER (PARTITION BY contestantid ORDER BY contestid DESC) AS rn FROM contest ) sub WHERE rn <= 5 GROUP BY contestantid;`;

  const lastFiveMatchesResult = await db.query(lastFiveMatchessql);

  res.header("Access-Control-Allow-Origin", "*");
  res.json({
    contestantTile: contestantTileResult.rows,
    pointsTable: pointsTableResult.rows,
    lastFiveMatches: lastFiveMatchesResult.rows,
  });
});

app.listen(port, () => {
  console.log(`Server Started on port ${port}`);
});
