exports.sinon= require('sinon');

var sinonChai = require('sinon-chai');
var chai = require('chai');

chai.use(sinonChai);

exports.expect = chai.expect;
exports.supertest = require('supertest');
exports.mockableObject = require('./mockableObject.js');
