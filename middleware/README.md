## middleware

The middleware is used to store logs from each response with the user's consent.

This uses [Flask](https://flask.palletsprojects.com/en/2.0.x/) to serve the frontend.

### Overview
 
The script is used to update the csv file hosted created using osome.developer@gmail.com. 

### Create a .env file and change the settings over there. 
```
DEBUG_MODE=True
FLASK_PORT=8087
FLASK_HOST=localhost

GOOGLE_API_KEY=API_KEY_FILE

SPREADSHEET_ID=/PATH

LOG_FILE=/PATH
```

#### If you add new dependencies, please update the requirements.txt file.
```
pip freeze > requirements.txt
```

#### Install the dependencies
```
pip install -r requirements.txt
```



