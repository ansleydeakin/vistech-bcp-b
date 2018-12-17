## BCPAPP

## Run the app locally

Author: Ansley Lam

# 1. To run the app locally, please ensure the following have been installed:

Node.js - https://nodejs.org/en/download/
Visual Studio Code -https://code.visualstudio.com/
Githuh Desktop - https://desktop.github.com/

# 2. Ensure Github Desktop has cloned the respository to your local drive. 
 - Select File> Clone Repository
 - Input URL (https://github.com/ansleydeakin/vistech-bcp-b)
 
*Pretty straight forward, best practice is to pull first, apply changes and push. In this case, we will be pushing changes direct to Master branch

# 3. Run Visual Studio Code
 - Selecy "Open Folder"
 - Open the local clone of the Github respository
 - Select the cross at the bottom left of the screen
 - Select "Terminal" option
 - Type "npm install" *It will begin installing modules based on what has been specified in Package.json
 - Type "cd server" to change the directory to "vistech-bcp-b\server"
 - Type "npm start" to run the web server
 
*Once completed, you'll be able to access the locally hosted web server via http://localhost:3000

# For Front-end Developer & UX/UI Designer
 - Front-end related files can be found in the "vistech-bcp-b\public folder"
 
# For Back-end Developer 
 - Back-end .js can be found in "vistech-bcp-b\server\server.js"
 - MySQL DB can be access via MySQL Workbench with the provided credentials

