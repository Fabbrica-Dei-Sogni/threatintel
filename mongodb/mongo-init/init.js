db = db.getSiblingDB("admin");
// move to the admin db - always created in Mongo
db.auth("admin", "cambiapwd");
// log as root admin if you decided to authenticate in your docker-compose file...

// create and move to your new database
db = db.getSiblingDB("threatinteldb");
db.createUser({
  user: "intelagent",
  pwd: "intelagent",
  roles: [
    {
      role: "dbOwner",
      db: "threatinteldb",
    },
  ],
});
// user created

// add new collection
//db.createCollection('helloworld_portfolio');

//le collection dei modelli mongodb del portfolio digitale vengono istanziati qui la prima volta

//others operations init...
