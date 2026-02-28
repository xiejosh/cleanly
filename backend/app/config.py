from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Supabase
    supabase_url: str = ""
    supabase_key: str = ""

    # CVAT
    cvat_base_url: str = "https://app.cvat.ai"
    cvat_username: str = ""
    cvat_password: str = ""

    # OpenAI
    openai_api_key: str = ""

    # App
    frontend_url: str = "http://localhost:3000"

    model_config = {"env_file": ".env"}


settings = Settings()
