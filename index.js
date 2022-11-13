const SERVER_NAME = 'Patient-Data-Management-Application'
const PORT = 5000
const HOST = '127.0.0.1'
const dbConnectionStr = 'mongodb://127.0.0.1:27017/patient_data'

let restify = require('restify')
var errors = require('restify-errors');
let mongoose = require('mongoose')
createDBConnection()
let Patient = createModel('Patient', require('./patientSchema.js'))
let ClinicalData = createModel('ClinicalData', require('./ClinicalDataSchema'))
let BloodPressureData = createModel('ClinicalData', require('./BloodPressureDataSchema'))
let TreatmentRecord = createModel('TreatmentRecord', require('./TreatmentRecordSchema'))
let User = createModel('User', require('./UserSchema'))

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
    const id = req.params.id.split("=")[1] // get the id from the param string
    Patient.find({ _id: id })
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
        console.log('Respond POST request: /patients')
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

// Get the latest records of clinical data (Diastolic and systolic blood Pressure,
// Respiratory rate, Blood oxygen Level, Heart beat rate) of a patient
server.get('/patients/:id/tests', async function(req, res, next) {
    const id = req.params.id.split("=")[1] // get the id from the param string
    console.log(`Received GET request: /patients/${id}/tests`)

    try {
        let clinicalDatas = []
        let clinicalData;
        // Find Blood pressure
        clinicalData = await ClinicalData.find({patient_id: id, category: 'Blood pressure'})
            .sort([['date', 'desc'], ['time'], 'desc'])
            .limit(1)
            .exec()
        if (clinicalData)
            clinicalDatas.push(clinicalData)
        // Find Respiratory rate
        clinicalData = await ClinicalData.find({patient_id: id, category: 'Respiratory rate'})
            .sort([['date', 'desc'], ['time'], 'desc'])
            .limit(1)
            .exec()
        if (clinicalData)
            clinicalDatas.push(clinicalData)
        // Find Blood oxygen level
        clinicalData = await ClinicalData.find({patient_id: id, category: 'Blood oxygen level'})
            .sort([['date', 'desc'], ['time'], 'desc'])
            .limit(1)
            .exec()
        if (clinicalData)
            clinicalDatas.push(clinicalData)
        // Find Heart beat rate
        clinicalData = await ClinicalData.find({patient_id: id, category: 'Heart beat rate'})
            .sort([['date', 'desc'], ['time'], 'desc'])
            .limit(1)
            .exec()
        if (clinicalData)
            clinicalDatas.push(clinicalData)

        console.log(`Respond GET request: /patients/${id}/tests`)
        res.send(clinicalDatas)
    }
    catch (error) {
        console.log(`Respond GET request: /patients/${id}/tests`)
        return next(new Error(JSON.stringify(error.errors)))
    }
})

//Add records of clinical data (Diastolic and systolic blood Pressure, Respiratory rate,
//Blood oxygen Level, Heart beat rate) of a patient
server.post('/patients/:id/tests', async function(req, res, next) {
    const id = req.params.id.split("=")[1] // get the id from the param string
    console.log(`Received POST request: /patients/${id}/tests`)
    console.log('params=>' + JSON.stringify(req.params))
    console.log('body=>' + JSON.stringify(req.body))
    let errorMsg = ''
    for (let testParams of req.body) {
        errorMsg = validateAddTestsParams(testParams)
    }
    if (errorMsg !== '') {
        console.log(`Respond POST request: /patients/${id}/tests`)
        return next(new errors.BadRequestError(errorMsg))
    }

    let savedClinicalDatas = []
    // save to db
    for (let testParams of req.body) {
        // Creating new clinicalData
        let newClinicalDataParams = {
            patient_id: testParams.patient_id,
            date: testParams.date,
            time: testParams.time,
            nurse_name: testParams.nurse_name,
            type: testParams.type,
            category: testParams.category,
            readings: testParams.readings
        }
        let newClinicalData;
        if (testParams.category == 'Blood pressure') {
            newClinicalData = BloodPressureData(newClinicalDataParams)
        }
        else {
            newClinicalData = ClinicalData(newClinicalDataParams)
        }

        // save the new test to db
        try {
            let result = await newClinicalData.save()
            savedClinicalDatas.push(result)
        }
        catch (error) {
            console.log(`Respond POST request: /patients/${id}/tests`)
            return next(new Error(JSON.stringify(error.errors)))
        }
    }

    console.log(`Respond POST request: /patients/${id}/tests`)
    res.send(201, savedClinicalDatas)
})

// Get all the treatment records of a patient
server.get('/patients/:id/treatments', function(req, res, next) {
    const id = req.params.id.split("=")[1] // get the id from the param string
    console.log(`Received GET request: /patients/${id}/treatments`)
    TreatmentRecord.find({patient_id: id})
    .exec((error, treatmentRecords) => {
        console.log(`Respond GET request: /patients/${id}/treatments`)
        if (treatmentRecords) {
            res.send(treatmentRecords)
        }
        else {
            res.send(404)
        }
    })
})

// Add one treatment record of a patient to the system
server.post('/patients/:id/treatments', function(req, res, next) {
    const id = req.params.id.split("=")[1] // get the id from the param string
    console.log(`Received POST request: /patients/${id}/treatments`)
    console.log('params=>' + JSON.stringify(req.params))
    console.log('body=>' + JSON.stringify(req.body))
    let errorMsg = validateAddTreatmentRecordParams(req.body)
    if (errorMsg !== '') {
        console.log(`Respond POST request: /patients/${id}/treatments`)
        return next(new errors.BadRequestError(errorMsg))
    }

    // Creating new TreatmentRecord
    let newTreatmentRecord = TreatmentRecord({
        patient_id: req.body.patient_id,
        treatment: req.body.treatment,
        date: req.body.date,
        description: req.body.description
    })

    // save the new treatment record to db
    newTreatmentRecord.save((error, result) => {
        console.log(`Respond POST request: /patients/${id}/treatments`)
        if (error)
            return next(new Error(JSON.stringify(error.errors)))
        res.send(201, result)
    })
})

// login
server.get('/login', function(req, res, next) {
    console.log('Received GET request: /login')
    User.find({user_name: req.body.user_name})
    .exec((error, result) => {
        console.log('Respond GET request: /login')
        if (error) {
            return next(new Error(JSON.stringify(error.errors)))
        }
        if (result === null || result === undefined) {
            res.send(400)
        }
        else if (result.password !== req.body.password) {
            res.send(400)
        }
        else {
            res.send({
                user_type: result.user_type
            })
        }
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

// validate the parameters of the api '/patients/:id/tests' POST
// return error message if any error, otherwise return empty string
function validateAddTestsParams(params) {
    if (isEmptyString(params.patient_id)) {
        return 'patient_id is empty'
    }
    if (isEmptyString(params.date)) {
        return 'date is empty'
    }
    if (isEmptyString(params.time)) {
        return 'time is empty'
    }
    if (isEmptyString(params.nurse_name)) {
        return 'nurse_name is empty'
    }
    if (isEmptyString(params.type)) {
        return 'type is empty'
    }
    if (isEmptyString(params.category)) {
        return 'category is empty'
    }
    switch (params.category) {
        case 'Blood pressure':
            if (isNaN(params.readings.diastolic)) {
                return 'diastolic is not a number'
            }
            if (isNaN(params.readings.systolic)) {
                return 'systolic is not a number'
            }
            break
        case 'Respiratory rate':
        case 'Blood oxygen level':
        case 'Heart beat rate':
            if (isNaN(params.readings)) {
                return 'readings is not a number'
            }
            break
        default:
            return 'category is not valid'
    }

    return ''
}

function validateAddTreatmentRecordParams(params) {
    if (isEmptyString(params.patient_id)) {
        return 'patient_id is empty'
    }
    if (isEmptyString(params.treatment)) {
        return 'treatment is empty'
    }
    if (isEmptyString(params.date)) {
        return 'date is empty'
    }
    if (isEmptyString(params.description)) {
        return 'description is empty'
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