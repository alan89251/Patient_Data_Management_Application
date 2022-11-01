const SERVER_NAME = 'Patient-Data-Management-Application'
const PORT = 5000
const HOST = '127.0.0.1'

let restify = require('restify')

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
