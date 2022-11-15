const SERVER_NAME = 'Patient-Data-Management-Application'
const PORT = 80
const HOST = '127.0.0.1'
const dbConnectionStr = process.env.MONGODB_URI

let restify = require('restify')
var errors = require('restify-errors');
let mongoose = require('mongoose')
createDBConnection()
let Patient = createModel('Patient', require('./patientSchema.js'))
let ClinicalData = createModel('ClinicalData', require('./ClinicalDataSchema'))
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
server.use(restify.plugins.fullResponse())
    .use(restify.plugins.bodyParser())

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
    Patient.findOne({ _id: req.params.id })
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
    console.log(`Received GET request: /patients/${req.params.id}/tests`)

    try {
        let clinicalDatas = []
        let queryResults = await findLatestClinicalDataByPatientId(req.params.id)
        for (let clinicalData of queryResults) {
            let date = new Date(clinicalData.datetime)
            clinicalData.date = String(date.getDate()).padStart(2, '0')
                + '/' + String(date.getMonth() + 1).padStart(2, '0')
                + '/' + String(date.getFullYear()).padStart(2, '0')
            clinicalData.time = String(date.getHours()).padStart(2, '0')
                + ':' + String(date.getMinutes()).padStart(2, '0')
                + ':' + String(date.getSeconds()).padStart(2, '0')
            delete clinicalData.datetime
            clinicalDatas.push(clinicalData)
        }

        console.log(`Respond GET request: /patients/${req.params.id}/tests`)
        res.send(clinicalDatas)
    }
    catch (error) {
        console.log(`Respond GET request: /patients/${req.params.id}/tests`)
        return next(new Error(JSON.stringify(error.errors)))
    }
})

//Add records of clinical data (Diastolic and systolic blood Pressure, Respiratory rate,
//Blood oxygen Level, Heart beat rate) of a patient
server.post('/patients/:id/tests', async function(req, res, next) {
    console.log(`Received POST request: /patients/${req.params.id}/tests`)
    console.log('params=>' + JSON.stringify(req.params))
    console.log('body=>' + JSON.stringify(req.body))
    let errorMsg = ''
    for (let testParams of req.body) {
        errorMsg = validateAddTestsParams(testParams)
    }
    if (errorMsg !== '') {
        console.log(`Respond POST request: /patients/${req.params.id}/tests`)
        return next(new errors.BadRequestError(errorMsg))
    }

    let savedClinicalDatas = []
    // save to db
    for (let testParams of req.body) {
        // parse timestamp
        let dateParts = testParams.date.split('/')
        let timeParts = testParams.time.split(':')
        let timestamp = new Date(dateParts[2], dateParts[1], dateParts[0], timeParts[0], timeParts[1], timeParts[2]).getTime()
        // Creating new clinicalData
        let newClinicalData = ClinicalData({
            patient_id: testParams.patient_id,
            datetime: timestamp,
            nurse_name: testParams.nurse_name,
            type: testParams.type,
            category: testParams.category,
            readings: testParams.readings
        })

        // save the new test to db
        try {
            let result = await newClinicalData.save()
            savedClinicalDatas.push(result)
        }
        catch (error) {
            console.log(`Respond POST request: /patients/${req.params.id}/tests`)
            return next(new Error(JSON.stringify(error.errors)))
        }
    }

    console.log(`Respond POST request: /patients/${req.params.id}/tests`)
    res.send(201, savedClinicalDatas)
})

// Get all the treatment records of a patient
server.get('/patients/:id/treatments', function(req, res, next) {
    console.log(`Received GET request: /patients/${req.params.id}/treatments`)
    TreatmentRecord.find({patient_id: req.params.id})
    .exec((error, treatmentRecords) => {
        console.log(`Respond GET request: /patients/${req.params.id}/treatments`)
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
    console.log(`Received POST request: /patients/${req.params.id}/treatments`)
    console.log('params=>' + JSON.stringify(req.params))
    console.log('body=>' + JSON.stringify(req.body))
    let errorMsg = validateAddTreatmentRecordParams(req.body)
    if (errorMsg !== '') {
        console.log(`Respond POST request: /patients/${req.params.id}/treatments`)
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
        console.log(`Respond POST request: /patients/${req.params.id}/treatments`)
        if (error)
            return next(new Error(JSON.stringify(error.errors)))
        res.send(201, result)
    })
})

// List all patients in critical condition
server.get('/critical-patients', async function(req, res, next) {
    console.log('Received GET request: /critical-patients')

    // List all patients
    let patients = await Patient.find({})
        .exec()
    let response = []
    for (let patient of patients) {
        let clinicalDatas = await findLatestClinicalDataByPatientId(String(patient._id))
        let isInCriticalCondition = false
        let patientDetail = {}
        patientDetail.reason = ''
        for (let clinicalData of clinicalDatas) {
            switch (clinicalData.category) {
                case "Blood pressure":
                    patientDetail.systolic_blood_pressure = clinicalData.readings.systolic
                    patientDetail.diastolic_blood_pressure = clinicalData.readings.diastolic
                    if (clinicalData.readings.systolic > 180) {
                        isInCriticalCondition = true
                        patientDetail.reason = patientDetail.reason + 'systolic blood pressure > 180 mmHg;'
                    }
                    if (clinicalData.readings.diastolic > 120) {
                        isInCriticalCondition = true
                        patientDetail.reason = patientDetail.reason + 'diastolic blood pressure > 120 mmHg;'
                    }
                    break

                case "Respiratory rate":
                    patientDetail.respiratory_rate = clinicalData.readings
                    if (clinicalData.readings < 12) {
                        isInCriticalCondition = true
                        patientDetail.reason = patientDetail.reason + 'respiratory rate < 12 per min;'
                    }
                    else if (clinicalData.readings > 25) {
                        isInCriticalCondition = true
                        patientDetail.reason = patientDetail.reason + 'respiratory rate > 25 per min;'
                    }
                    break

                case "Heart beat rate":
                    patientDetail.heart_beat_rate = clinicalData.readings
                    if (clinicalData.readings > 200) {
                        isInCriticalCondition = true
                        patientDetail.reason = patientDetail.reason + 'eart beat rate > 200 per min;'
                    }
                    break

                case "Blood oxygen level":
                    patientDetail.blood_oxygen_level = clinicalData.readings
                    if (clinicalData.readings <= 88) {
                        isInCriticalCondition = true
                        patientDetail.reason = patientDetail.reason + 'blood oxygen level <= 88%;'
                    }
                    break
                default:
                    break
            }
        }

        if (isInCriticalCondition) {
            patientDetail.reason = patientDetail.reason.slice(0, -1) // remove the tailing ';'
            patientDetail.patient_id = patient._id
            patientDetail.first_name = patient.first_name
            patientDetail.last_name = patient.last_name
            response.push(patientDetail)
        }
    }

    console.log('Respond GET request: /critical-patients')
    res.send(response)
})

// login
server.post('/login', function(req, res, next) {
    console.log('Received GET request: /login')
    User.findOne({user_name: req.body.user_name})
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

//
server.post('/user', async function(req, res, next) {
    let user = User({
        user_name: req.body.user_name,
        password: req.body.password,
        user_type: req.body.user_type
    })
    let result = await user.save()
    res.send(result)
})
//

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

// find latest clinical data of the specified patient id
async function findLatestClinicalDataByPatientId(patientId) {
    return await ClinicalData.aggregate([
        {
            $match: {
                patient_id: patientId
            }
        },
        {
            $group: {
                _id: {
                    patient_id: '$patientId',
                    category: '$category'
                },
                latestDatetime: { 
                    $max: '$datetime'
                },
                details: {
                    $push: '$$ROOT'
                }
            }
        },
        {
            "$project": {
                _id: 0,
                proj_details: {
                    "$setDifference": [
                        {
                            "$map": {
                                "input": "$details",
                                "as": "mapped",
                                "in": {
                                    "$cond": [
                                        {
                                            "$eq": ["$latestDatetime", "$$mapped.datetime"]
                                        },
                                        "$$mapped",
                                        false
                                    ]
                                }
                            }
                        },
                        [false]
                    ]
                }
            }
        },
        {
            $unwind: '$proj_details'
        },
        {
            $project: {
                '_id': '$proj_details._id',
                'patient_id': '$proj_details.patient_id',
                'datetime': '$proj_details.datetime',
                'nurse_name': '$proj_details.nurse_name',
                'type': '$proj_details.type',
                'category': '$proj_details.category',
                'readings': '$proj_details.readings',
            }
        }
    ])
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