"""
Purpose:
    This script is to get the data(post content) from the Chrome Extension and process the data.
Inputs:
    Facebook post data(title, content)
Output:
    The processed data.
Authors: Pasan Kamburugamuwa
"""

import os
import logging
import gspread
from flask import Blueprint,request,jsonify,json
from oauth2client.service_account import ServiceAccountCredentials
from dotenv import load_dotenv

# Load environment variables first
load_dotenv()

# Get the log path and log file.
LOG_FILE = os.getenv("LOG_FILE")

# blueprint NewsBridge
blueprint = Blueprint('newsbridge', __name__, url_prefix='/api')

# Get the API key path
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
SPREADSHEET_ID = os.getenv("SPREADSHEET_ID")

@blueprint.route('/update-csv', methods=['POST'])
def update_csv():
    """
    Update the Google sheet with news headlines and API responses.

    Parameters
    ----------
    Inputs:
        uid (str): Unique extension Id.
        postId (str): Post Id.
        newsHeadline (str): NewsHeadline of the post.
        googleapiresponse (str): Google API response.
        generatedComment (str): Generated comment.
        isComment (boolean): true/false
    Returns
    ----------
    result (dict): {'message': 'Data updated successfully'}
    """
    try:
        script_name = os.path.basename(__file__)
        logger = get_logger(script_name)

        # Define the scope
        scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]

        creds = ServiceAccountCredentials.from_json_keyfile_name(GOOGLE_API_KEY, scope)

        client = gspread.authorize(creds)

        sheet = client.open_by_key(SPREADSHEET_ID).sheet1

        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        uid = data.get('uid')
        post_id = data.get('postId')
        news_headline = data.get('newsHeadline')
        recorded_at = data.get('recordedAt')
        ai_platform = data.get('aiPlatform')
        api_response = data.get('apiResponse')
        generated_comment = data.get('generatedComment')
        is_comment = data.get('isComment')

        data_to_update = {
            "UID": uid,
            "Post Id": post_id,
            "AI Platform": ai_platform,
            "Recorded At": recorded_at,
            "News Headline": news_headline,
            "Web Search Content": api_response,
            "Generated Comment": generated_comment
        }

        headers = sheet.row_values(1)

        if is_comment:
            generated_comment_col_index = headers.index("Generated Comment") + 1

            rows = sheet.get_all_records()

            for i, row in enumerate(rows):
                if row["UID"] == uid and row["Post Id"] == post_id:
                    sheet.update_cell(i + 2, generated_comment_col_index, generated_comment)
                    logger.info(f"Comment updated successfully for UID: {uid}, Post Id: {post_id}.")
                    return jsonify({'message': 'Comment updated successfully'})

            # If no matching row is found
            logger.error(f"No matching row found for UID: {uid}, Post Id: {post_id}.")
            return jsonify({'error': 'No matching row found'}), 404

        else:
            rows = sheet.get_all_records()

            for i, row in enumerate(rows):
                if row["UID"] == uid and row["Post Id"] == post_id:
                    for header, value in data_to_update.items():
                        if header in headers:
                            col_index = headers.index(header) + 1
                            sheet.update_cell(i + 2, col_index, value)
                            logger.info(f"Data for '{header}' updated successfully.")
                    return jsonify({'message': 'Record updated successfully'})

            max_row = max(len(sheet.col_values(headers.index(header) + 1)) for header in data_to_update if header in headers)

            for header, value in data_to_update.items():
                if header in headers:
                    col_index = headers.index(header) + 1
                    sheet.update_cell(max_row + 1, col_index, value)
                    logger.info(f"Data for '{header}' updated successfully.")
                else:
                    logger.error(f"Header '{header}' not found in the sheet.")

            return jsonify({'message': 'Add record to csv successfully'})

    except Exception as e:
        logger.error(f"Error occurred during updating the Google sheet: {e}")
        return jsonify({'error': 'An error occurred while updating the sheet', 'details': str(e)}), 500


def get_logger(script_name=None):
    """
    Create logger for the project.
    """
    logger = logging.getLogger(script_name)
    logger.setLevel(logging.INFO)

    formatter = logging.Formatter(
        fmt="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d_%H:%M:%S",
    )

    # LOG FILE path
    fh = logging.FileHandler(LOG_FILE)
    fh.setFormatter(formatter)
    fh.setLevel(logging.INFO)

    if not logger.hasHandlers():
        logger.addHandler(fh)

    ch = logging.StreamHandler()
    ch.setFormatter(formatter)
    ch.setLevel(logging.INFO)
    if not any(isinstance(h, logging.StreamHandler) for h in logger.handlers):
        logger.addHandler(ch)

    return logger