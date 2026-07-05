from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    chroma_host: str = "chroma"
    chroma_port: int = 8000
    embedding_model: str = "all-MiniLM-L6-v2"
    chunk_size: int = 512
    chunk_overlap: int = 64
    collection_name: str = "research_papers"
    ncbi_email: str = ""
    ncbi_api_key: str = ""
    ncbi_tool: str = "research-assistant"


settings = Settings()
