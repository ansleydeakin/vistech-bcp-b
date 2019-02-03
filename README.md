# BCPMe

# Run the app locally

## 1. To run the app locally, please ensure the following have been installed:
- Node.js - https://nodejs.org/en/download/ 
- Visual Studio Code -https://code.visualstudio.com/ 
- Github Desktop - https://desktop.github.com/
- MySQL Workbench - https://www.mysql.com/products/workbench/

## 2. Ensure Github Desktop has cloned the repository to your local drive.
- Select File> Clone Repository
- Input URL (https://github.com/ansleydeakin/vistech-bcp-b)

## 3. Run Visual Studio Code
- Select "Open Folder"
- Open the local clone of the Github repository
- Select the cross at the bottom left of the screen
- Select "Terminal" option
- Type "npm install" *It will begin installing modules based on what has been specified in Package.json
- Type "cd server" to change the directory to "vistech-bcp-b\server"
- Type "npm start" to run the web server
*Once completed, you'll be able to access the locally hosted web server via http://localhost:3000


## For Front-end Developer & UX/UI Designer
- Front-end related files can be found in the "vistech-bcp-b\public folder"
#For Back-end Developer
- Back-end .js can be found in "vistech-bcp-b\server\server.js"
-	MySQL DB can be access via MySQL Workbench with the provided credentials
## For Database Administrators
- The current database in operation is currently located in IBM cloud and can be accessed with the following credentials utilising MySQL Workbench:
- User -- admin 
- Password -- ZVJKNWUGFGFEXJBK 
- Host -- sl-us-south-1-portal.47.dblayer.com 
- Port -- 17869 
- Mode -- ssl-mode=REQUIRED
