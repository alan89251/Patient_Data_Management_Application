const SERVER_NAME = 'Patient-Data-Management-Application'
const PORT = 5000
const HOST = '127.0.0.1'
const dbConnectionStr = 'mongodb://127.0.0.1:27017/patient_data'

let restify = require('restify')
var errors = require('restify-errors');
let mongoose = require('mongoose')
createDBConnection()
let Patient = createModel('Patient', require('./patientSchema.js'))

let server = restify.createServer({name: SERVER_NAME})
server.listen(PORT, HOST, function () {
    const baseUrl = 'http://' + HOST + ':' + PORT
    console.log('Server is listening at ' + baseUrl)
    console.log('Endpoints:')
    console.log(baseUrl + '/patients method: GET, POST')
    console.log(baseUrl + '/patients/:id method: GET')
})
server.use(restify.fullResponse())
    .use(restify.bodyParser())

// Get all patients
server.get('/patients', function(req, res, next) {
    console.log('Received GET request: /patients')
    Patient.find({})
    .exec( (error, result) => {
        console.log('Respond GET request: /patients')
        if (error) 
            return next(new Error(JSON.stringify(error.errors)))
        res.send(result);
    })
})

// Get a single patient by their patient id
server.get('/patients/:id', function(req, res, next) {
    console.log(`Received GET request: /patients/${req.params.id}`)
    Patient.find({ _id: req.params.id })
    .exec((error, patient) => {
        console.log(`Respond GET request: /patients/${req.params.id}`)
        if (patient) {
            res.send(patient)
        }
        else {
            res.send(404)
        }
    })
})

// Create a new patient
server.post('/patients', function (req, res, next) {
    console.log('Received POST request: /patients')
    console.log('params=>' + JSON.stringify(req.params))
    console.log('body=>' + JSON.stringify(req.body))
    let errorMsg = validateAddPatientParams(req.body)
    if (errorMsg !== '') {
        return next(new errors.BadRequestError(errorMsg))
    }

    // Creating new patient
    let newPatient = new Patient({
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        address: req.body.address,
        date_of_birth: req.body.date_of_birth,
        department: req.body.department,
        doctor: req.body.doctor,
        sex: req.body.sex,
        phone_number: req.body.phone_number,
        emergency_contact_first_name: req.body.emergency_contact_first_name,
        emergency_contact_last_name: req.body.emergency_contact_last_name,
        emergency_contact_phone_number: req.body.emergency_contact_phone_number,
        date_of_admission: req.body.date_of_admission,
        bed_number: req.body.bed_number,
        photo: req.body.photo
    })

    // save the new patient to db
    newPatient.save((error, result) => {
        console.log('Respond POST request: /patients')
        if (error)
            return next(new Error(JSON.stringify(error.errors)))
        res.send(201, result)
    })
})

// validate the parameters of the api '/patients' POST
// return error message if any error, otherwise return empty string
function validateAddPatientParams(params) {
    if (isEmptyString(params.first_name)) {
        return 'first_name is empty'
    }
    if (isEmptyString(params.last_name)) {
        return 'last_name is empty'
    }
    if (isEmptyString(params.address)) {
        return 'address is empty'
    }
    if (isEmptyString(params.date_of_birth)) {
        return 'date_of_birth is empty'
    }
    if (isEmptyString(params.department)) {
        return 'department is empty'
    }
    if (isEmptyString(params.doctor)) {
        return 'doctor is empty'
    }
    if (isEmptyString(params.sex)) {
        return 'sex is empty'
    }
    if (isEmptyString(params.phone_number)) {
        return 'phone_number is empty'
    }
    if (isEmptyString(params.emergency_contact_first_name)) {
        return 'emergency_contact_first_name is empty'
    }
    if (isEmptyString(params.emergency_contact_last_name)) {
        return 'emergency_contact_last_name is empty'
    }
    if (isEmptyString(params.emergency_contact_phone_number)) {
        return 'emergency_contact_phone_number is empty'
    }
    if (isEmptyString(params.date_of_admission)) {
        return 'date_of_admission is empty'
    }
    if (isEmptyString(params.bed_number)) {
        return 'bed_number is empty'
    }
    if (isEmptyString(params.photo)) {
        return 'photo is empty'
    }

    return ''
}

// check if the string is undefined, null or empty
function isEmptyString(str) {
    return str === undefined || str === null || str === ""
}

// connect to mongoDB and return the connection instance
function createDBConnection() {
    mongoose.connect(dbConnectionStr, {useNewUrlParser: true})
    let db = mongoose.connection
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', () => {
        console.log("Connected to db: " + dbConnectionStr)
    })
    return db
}

// create db model
function createModel(name, schema) {
    return mongoose.model(name,
        new mongoose.Schema(schema))
}