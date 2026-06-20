import os
import sys
import requests
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# Add the project root to python path for clean imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.utils import setup_logger

# Load environment variables
load_dotenv()

# Initialize Logger
logger = setup_logger("api_client", "logs/app.log")

# Get Backend URL from env
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000").rstrip('/')

class APIError(Exception):
    """Custom exception class representing API failures."""
    pass

class APIClient:
    """
    HTTP client wrapper handling calls to the FastAPI backend server.
    """
    def __init__(self, base_url: str = BACKEND_URL):
        self.base_url = base_url
        logger.info(f"API Client initialized pointing to: {self.base_url}")
        
    def check_health(self) -> bool:
        """
        Pings the backend health endpoint.
        
        Returns:
            True if backend is reachable and healthy, False otherwise.
        """
        try:
            url = f"{self.base_url}/health"
            response = requests.get(url, timeout=3.0)
            if response.status_code == 200:
                data = response.json()
                return data.get("status") == "healthy"
            return False
        except requests.RequestException as e:
            logger.warning(f"⚠ Health check failed. Backend might be offline: {e}")
            return False

    def predict(self, features: Dict[str, float]) -> Dict[str, Any]:
        """
        Sends feature vector to /predict endpoint.
        
        Args:
            features: Dictionary containing PCA features, Time, and Amount.
            
        Returns:
            The parsed prediction response dictionary.
        """
        url = f"{self.base_url}/predict"
        try:
            response = requests.post(url, json=features, timeout=10.0)
            
            # Check for error status
            if response.status_code != 200:
                detail = "Unknown error"
                try:
                    detail = response.json().get("detail", response.text)
                except Exception:
                    detail = response.text
                raise APIError(f"HTTP {response.status_code}: {detail}")
                
            return response.json()
        except requests.Timeout:
            logger.error("✖ Prediction request timed out.")
            raise APIError("Connection to backend timed out. Please try again.")
        except requests.ConnectionError:
            logger.error("✖ Connection error to backend.")
            raise APIError("Unable to connect to the backend server. Verify it is running at the configured URL.")
        except requests.RequestException as e:
            logger.error(f"✖ Request failed: {e}")
            raise APIError(f"Request failed: {str(e)}")

    def explain(self, features: Dict[str, float]) -> Dict[str, Any]:
        """
        Sends feature vector to /explain endpoint.
        
        Args:
            features: Dictionary containing PCA features, Time, and Amount.
            
        Returns:
            The parsed explanation response dictionary containing SHAP values.
        """
        url = f"{self.base_url}/explain"
        try:
            response = requests.post(url, json=features, timeout=15.0)
            
            if response.status_code != 200:
                detail = "Unknown error"
                try:
                    detail = response.json().get("detail", response.text)
                except Exception:
                    detail = response.text
                raise APIError(f"HTTP {response.status_code}: {detail}")
                
            return response.json()
        except requests.Timeout:
            logger.error("✖ Explanation request timed out.")
            raise APIError("Explainability calculation timed out. The backend is processing heavy computations.")
        except requests.ConnectionError:
            logger.error("✖ Connection error to backend during explain request.")
            raise APIError("Unable to connect to the backend server. Explainability service is currently unreachable.")
        except requests.RequestException as e:
            logger.error(f"✖ Explanation request failed: {e}")
            raise APIError(f"Explainability request failed: {str(e)}")
