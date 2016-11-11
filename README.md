# energywebapp
This express app, at present, can accept two command-line arguments specifying client id and client secret obtained from a SmartThings application, then allow a user to visit '/initialize' to use Oauth 2.0 to connect the app to SmartThings. The '/' route will then return JSON from the SmartThings app '/switches' endpoint.
