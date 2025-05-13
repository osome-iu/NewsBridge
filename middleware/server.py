"""
Purpose:
    This script is used to store the user data.

Author: Pasan Kamburugamuwa
"""

import os
from flask import Flask
from helper import helper
from flask_cors import CORS
from dotenv import load_dotenv

app = Flask(__name__)

CORS(app, resources={r"/api/*": {"origins": "https://www.facebook.com"}})

app.register_blueprint(helper.blueprint)

script_name=os.path.basename(__file__)
logger = helper.get_logger(script_name)

if __name__ == '__main__':
    logger.info("-" * 50)
    logger.info(f"Starting News Bridge server : {script_name}")
    app.run(debug=os.getenv("DEBUG_MODE"), host=os.getenv("FLASK_HOST"), port=os.getenv("FLASK_PORT"))
