const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const databasePath = path.join(__dirname, "covid19India.db");

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

const convertDBObjectToResponseObjectState = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
     population: dbObject.population,
  };
};

// Returns a list of all states in the state table
app.get("/states/", async (request, response) => {
  const getAllStatesQuery = `
    SELECT 
    * 
    FROM
    state;`;
  const stateArray = await database.all(getAllStatesQuery);
  response.send(
    stateArray.map((eachState) =>
      convertDBObjectToResponseObjectState(eachState)
    )
  );
});

const convertDBObjectToResponseObjectState1 = (state) => {
  return {
    stateId: state.state_id,
    stateName: state.state_name,
    population: state.population,
  };
};

// Return a state base on the state Id
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
    SELECT 
    * 
    FROM
    state 
    WHERE
    state_id =${stateId};`;
  const state = await database.get(getStateQuery);
  console.log(stateId);
  response.send(convertDBObjectToResponseObjectState1(state));
});

//create a district in the district table district_id is auto_incremented

app.post("/districts/", async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const addDistrictQuery = `
    INSERT INTO 
   district(district_name, state_id, cases, cured, active, deaths)
   VALUES(
       '${districtName}',
       ${stateId},
       ${cases},
       ${cured},
       ${active},
       ${deaths});`;
  const dbResponse = await database.run(addDistrictQuery);
  response.send("District Successfully Added");
});

const convertDBObjectToResponseObjectDistrict = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

// Returns  a district based on the districtId

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `
    SELECT * FROM 
    district 
    WHERE 
    district_id = ${districtId};`;
  const district = await database.get(getDistrictQuery);
  response.send(convertDBObjectToResponseObjectDistrict(district));
});

// Delete a district from the district table based on he district Id.

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `
    DELETE
    FROM 
    district 
    WHERE
    district_id = ${districtId};`;
  await database.run(deleteDistrictQuery);
  response.send("District Removed");
});

// update teh details of a specific district based on the district Id

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const updateDistrictQuery = `
  UPDATE
  district
  SET 
  district_name= '${districtName}',
  state_id = ${stateId},
  cases = ${cases},
  active = ${active},
  deaths = ${deaths}
  WHERE
  district_id = ${districtId};`;
  await database.run(updateDistrictQuery);
  response.send("District Successfully Added");
});

const reportSnakeCaseToCamelCase = (stateReport) => {
  return {
    totalCases: stateReport.cases,
    totalCured: stateReport.cured,
    totalActive: stateReport.active,
    totalDeaths: stateReport.deaths,
  };
};

//Return the statistics of total cases cured, active, deaths of a specific state based on state ID

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStateReport = `
    SELECT SUM(cases) as cases,
    SUM(cured) as cured,
    SUM(active) as active,
    SUM(deaths) as deaths
    FROM 
    district 
    WHERE
    state_id = ${stateId};`;
  const stateReport = await database.get(getStateReport);
  const resultReport = reportSnakeCaseToCamelCase(stateReport);
  response.send(resultReport);
});

// Return an object containing the state name of a district based on the district Id

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const stateDetails = `
    SELECT 
    state_name
    FROM state
    JOIN district ON state.state_id = district.state_id
    WHERE district.district_id = ${districtId};`;
  const stateName = await database.get(stateDetails);
  response.send({ stateName: stateName.state_name });
});
module.exports = app;
