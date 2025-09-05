import logging
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from urllib.parse import urlencode, parse_qs
from pydantic import BaseModel

from garminconnect import Garmin
from garth.exc import GarthHTTPError, GarthException

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI()

# Define a Pydantic model for login credentials
class GarminLoginRequest(BaseModel):
    email: str
    password: str
    user_id: str # Sparky Fitness user ID
    # For MFA, if needed, a separate endpoint or a field in this model could be added

@app.get("/")
async def read_root():
    return {"message": "Garmin Connect Microservice is running!"}

@app.post("/auth/garmin/login")
async def garmin_login(request_data: GarminLoginRequest):
    """
    Performs direct login to Garmin Connect using email and password.
    Returns base64 encoded tokens or an MFA challenge.
    """
    try:
        garmin = Garmin(email=request_data.email, password=request_data.password, return_on_mfa=True)
        result1, result2 = garmin.login(scopes=["ACTIVITY_READ", "CONNECT_READ", "WELLNESS_READ"])

        if result1 == "needs_mfa":
            logger.info(f"MFA required for user {request_data.user_id}.")
            # In a real application, you'd store client_state (result2) and prompt user for MFA code
            # For this POC, we'll return a specific status.
            return {"status": "needs_mfa", "client_state": result2}
        else:
            tokens = garmin.garth.dumps() # Base64 encoded string of tokens
            logger.info(f"Successfully obtained Garmin tokens for user {request_data.user_id}.")
            logger.debug(f"Garmin tokens (suppressed): {tokens}") # Log suppressed tokens
            logger.debug(f"OAuth1 Token: {garmin.garth.oauth1_token}")
            logger.debug(f"OAuth2 Token: {garmin.garth.oauth2_token}")
            return {"status": "success", "tokens": tokens}

    except GarthHTTPError as e:
        logger.error(f"Garmin login error: {e}")
        raise HTTPException(status_code=500, detail=f"Garmin login error: {e}")
    except GarthException as e:
        logger.error(f"Error during Garmin login: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to login to Garmin: {e}")
    except Exception as e:
        logger.error(f"Unexpected error during Garmin login: {e}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")

@app.post("/auth/garmin/resume_login")
async def garmin_resume_login(request: Request):
    """
    Resumes Garmin login after MFA code is provided.
    """
    try:
        data = await request.json()
        client_state = data.get("client_state")
        mfa_code = data.get("mfa_code")
        user_id = data.get("user_id") # Sparky Fitness user ID

        if not client_state or not mfa_code or not user_id:
            raise HTTPException(status_code=400, detail="Missing client_state, mfa_code, or user_id.")

        garmin = Garmin() # Initialize an empty Garmin object
        garmin.resume_login(client_state, mfa_code)
        tokens = garmin.garth.dumps()
        logger.info(f"Successfully resumed Garmin login for user {user_id}.")
        logger.debug(f"Garmin tokens (suppressed): {tokens}") # Log suppressed tokens
        return {"status": "success", "tokens": tokens}

    except GarthHTTPError as e:
        logger.error(f"Garmin MFA error: {e}")
        raise HTTPException(status_code=500, detail=f"Garmin MFA error: {e}")
    except GarthException as e:
        logger.error(f"Error during Garmin MFA: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to complete Garmin MFA: {e}")
    except Exception as e:
        logger.error(f"Unexpected error during Garmin MFA: {e}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")

@app.post("/data/daily_summary")
async def get_daily_summary(request: Request):
    """
    Retrieves daily summary data (e.g., steps, calories) for a specific date.
    Requires base64 encoded Garmin tokens in the request body.
    """
    try:
        data = await request.json()
        user_id = data.get("user_id")
        tokens_b64 = data.get("tokens")
        cdate = data.get("date") # YYYY-MM-DD format

        if not user_id or not tokens_b64 or not cdate:
            raise HTTPException(status_code=400, detail="Missing user_id, tokens, or date.")

        garmin = Garmin()
        garmin.garth.loads(tokens_b64) # Load tokens from base64 string
        logger.debug(f"Loaded tokens into garth. Username (external_user_id): {garmin.garth.username}")
        logger.debug(f"Garth profile: {garmin.garth.profile}")
        logger.debug(f"Garth oauth1_token: {garmin.garth.oauth1_token}")
        logger.debug(f"Garth oauth2_token: {garmin.garth.oauth2_token}")
        logger.debug(f"OAuth2 Token Expires At: {garmin.garth.oauth2_token.expires_at}")
        logger.debug(f"OAuth2 Token Scopes: {garmin.garth.oauth2_token.scope}")

        # Explicitly fetch the user's profile to get the display name
        # The garminconnect library's get_user_summary expects only the date argument.
        # The display_name is handled internally by the garth session.
        # The garminconnect library's get_user_summary expects only the date argument.
        # The display_name is handled internally by the garth session.
        # Manually construct the URL with the numerical user ID
        summary_url = f"{garmin.garmin_connect_daily_summary_url}/{garmin.garth._user_profile['id']}"
        params = {"calendarDate": str(cdate)}
        summary_data = garmin.connectapi(summary_url, params=params)
        logger.info(f"Successfully retrieved daily summary for user {user_id} on {cdate}.")
        return {"user_id": user_id, "date": cdate, "data": summary_data}

    except GarthHTTPError as e:
        logger.error(f"Garmin API error (daily_summary): {e}")
        raise HTTPException(status_code=500, detail=f"Garmin API error: {e}")
    except GarthException as e:
        logger.error(f"Error retrieving daily summary: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve daily summary: {e}")
    except Exception as e:
        logger.error(f"Unexpected error retrieving daily summary: {e}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")

@app.post("/data/body_composition")
async def get_body_composition(request: Request):
    """
    Retrieves body composition data (e.g., weight) for a specific date or date range.
    Requires base64 encoded Garmin tokens in the request body.
    """
    try:
        data = await request.json()
        user_id = data.get("user_id")
        tokens_b64 = data.get("tokens")
        start_date = data.get("start_date") # YYYY-MM-DD format
        end_date = data.get("end_date") # YYYY-MM-DD format, optional

        if not user_id or not tokens_b64 or not start_date:
            raise HTTPException(status_code=400, detail="Missing user_id, tokens, or start_date.")

        garmin = Garmin()
        garmin.garth.loads(tokens_b64) # Load tokens from base64 string

        # The garminconnect library's get_body_composition expects start_date and optionally end_date.
        logger.debug(f"Calling get_body_composition with start_date: {start_date} and end_date: {end_date}")
        body_comp_data = garmin.get_body_composition(start_date, end_date)
        logger.info(f"Successfully retrieved body composition for user {user_id} from {start_date} to {end_date}.")
        return {"user_id": user_id, "start_date": start_date, "end_date": end_date, "data": body_comp_data}

    except GarthHTTPError as e:
        logger.error(f"Garmin API error (body_composition): {e}")
        raise HTTPException(status_code=500, detail=f"Garmin API error: {e}")
    except GarthException as e:
        logger.error(f"Error retrieving body composition: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve body composition: {e}")
    except Exception as e:
        logger.error(f"Unexpected error retrieving body composition: {e}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")

        logger.info(f"Successfully obtained Garmin tokens for user {user_id}.")

        # Redirect back to Sparky Fitness backend with tokens
        # The Node.js backend will then store these tokens securely
        redirect_url = f"{SPARKY_BACKEND_URL}/api/integrations/garmin/callback?user_id={user_id}&tokens={tokens}"
        return RedirectResponse(redirect_url)

    except GarthHTTPError as e:
        logger.error(f"Garmin OAuth error: {e.response.status_code} - {e.response.text}")
        raise HTTPException(status_code=e.response.status_code, detail=f"Garmin OAuth error: {e.response.text}")
    except GarthException as e:
        logger.error(f"Error during Garmin auth callback: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to complete Garmin authentication: {e}")
    except Exception as e:
        logger.error(f"Unexpected error during Garmin auth callback: {e}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")
