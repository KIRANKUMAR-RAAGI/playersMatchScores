const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const databasePath = path.join(__dirname, "cricketMatchDetails.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertPlayerDetailsDbObjectToResponseObject = (dbObject) => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,
  };
};

const convertMatchDetailsDbObjectToResponseObject = (dbObject) => {
  return {
    matchId: dbObject.match_id,
    match: dbObject.match,
    year: dbObject.year,
  };
};

const convertPlayerMatchScoreDbObjectToResponseObject = (dbObject) => {
  return {
    playerMatchId: dbObject.player_match_id,
    playerId: dbObject.player_id,
    matchId: dbObject.match_id,
    score: dbObject.score,
    fours: dbObject.fours,
    sixes: dbObject.sixes,
  };
};

app.get("/players/", async (request, response) => {
  const getPlayerQuery = `
    SELECT
        *
    FROM
        player_details`;

  const playerArray = await database.all(getPlayerQuery);

  response.send(
    playerArray.map((eachPlayer) =>
      convertPlayerDetailsDbObjectToResponseObject(eachPlayer)
    )
  );
});

app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerDetailsQuery = `
    SELECT 
        *
    FROM
        player_details
    WHERE 
        player_id = ${playerId}`;

  const playerDetails = await database.get(getPlayerDetailsQuery);
  response.send(convertPlayerDetailsDbObjectToResponseObject(playerDetails));
});

app.put("/players/:playerId/", async (request, response) => {
  const { playerName } = request.body;
  const { playerId } = request.params;

  const updatePlayerDetailsQuery = `
  UPDATE
    player_details
  SET
    player_name='${playerName}'
  WHERE 
    player_id = ${playerId}`;

  await database.run(updatePlayerDetailsQuery);
  response.send("Player Details Updated");
});

app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;

  const getMatchDetailsQuery = `
SELECT
    *
FROM 
    match_details 
WHERE
    match_id = ${matchId}`;

  const matchDetails = await database.get(getMatchDetailsQuery);

  response.send(convertMatchDetailsDbObjectToResponseObject(matchDetails));
});

app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerMatchDetailsQuery = `
    SELECT
    *
    FROM
        player_match_score
    NATURAL JOIN
        match_details
    WHERE
        player_id = ${playerId}`;

  const allMatchDetails = await database.all(getPlayerMatchDetailsQuery);
  response.send(
    allMatchDetails.map((eachMatch) =>
      convertMatchDetailsDbObjectToResponseObject(eachMatch)
    )
  );
});

app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;

  const getPlayerDetailsQuery = `
    SELECT
        *
    FROM
        player_match_score
    NATURAL JOIN
        player_details
    WHERE
        match_id=${matchId}`;

  const playerDetails = await database.all(getPlayerDetailsQuery);

  response.send(
    playerDetails.map((eachPlayer) =>
      convertPlayerDetailsDbObjectToResponseObject(eachPlayer)
    )
  );
});

app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;

  const getScoresOfPlayerQuery = `
    
    SELECT
        player_details.player_id AS playerId,
        player_details.player_name AS playerName,
        SUM(player_match_score.score) AS totalScore,
        SUM(fours) AS totalFours,
        SUM(sixes) AS totalSixes 
    FROM 
        player_details INNER JOIN player_match_score ON
        player_details.player_id = player_match_score.player_id
    WHERE 
        player_details.player_id = ${playerId};`;

  const playerScores = await database.get(getScoresOfPlayerQuery);

  response.send(playerScores);
});

module.exports = app;
