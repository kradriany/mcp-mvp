"""Context loader for ingesting external MCP documentation and repositories."""

import asyncio
import os
import tempfile
from pathlib import Path
from typing import List, Dict, Any
import numpy as np
import git
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import logging

logger = logging.getLogger(__name__)


class ContextLoader:
    """Loads and indexes external context from MCP repositories.
    
    Uses sentence-transformers to create embeddings of documentation
    and code for semantic search during runtime.
    """
    
    REPOS = [
        "https://github.com/modelcontextprotocol/modelcontextprotocol",
        "https://github.com/modelcontextprotocol/python-sdk",
    ]
    
    TUTORIAL_URL = "https://modelcontextprotocol.io/tutorials/building-mcp-with-llms"
    
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        """Initialize context loader with embedding model."""
        self.model = SentenceTransformer(model_name)
        self.documents: List[Dict[str, Any]] = []
        self.embeddings: np.ndarray = np.array([])
        self._context_dir = Path(tempfile.gettempdir()) / "_mcp_context"
        self._context_dir.mkdir(exist_ok=True)
    
    async def load_external_context(self) -> None:
        """Load all external context sources."""
        logger.info("Loading external MCP context...")
        
        # Clone and process repositories
        await self._process_repositories()
        
        # Generate embeddings
        if self.documents:
            texts = [doc["content"] for doc in self.documents]
            self.embeddings = self.model.encode(texts)
            logger.info(f"Generated {len(self.embeddings)} embeddings")
    
    async def _process_repositories(self) -> None:
        """Clone repositories and extract relevant content."""
        for repo_url in self.REPOS:
            repo_name = repo_url.split("/")[-1]
            repo_path = self._context_dir / repo_name
            
            try:
                # Clone with depth=1
                if not repo_path.exists():
                    logger.info(f"Cloning {repo_url}...")
                    git.Repo.clone_from(repo_url, repo_path, depth=1)
                
                # Process files
                await self._process_directory(repo_path, repo_name)
                
            except Exception as e:
                logger.error(f"Error processing {repo_url}: {e}")
    
    async def _process_directory(self, path: Path, source: str) -> None:
        """Process markdown and Python files in directory."""
        extensions = {".md", ".py"}
        
        for file_path in path.rglob("*"):
            if file_path.suffix in extensions and file_path.is_file():
                try:
                    content = file_path.read_text(encoding="utf-8")
                    
                    # Extract meaningful chunks
                    chunks = self._chunk_content(content, file_path.suffix)
                    
                    for chunk in chunks:
                        self.documents.append({
                            "content": chunk,
                            "source": source,
                            "file": str(file_path.relative_to(self._context_dir)),
                            "type": file_path.suffix
                        })
                        
                except Exception as e:
                    logger.debug(f"Error reading {file_path}: {e}")
    
    def _chunk_content(self, content: str, file_type: str) -> List[str]:
        """Split content into meaningful chunks."""
        if file_type == ".md":
            # Split by headers
            chunks = []
            current_chunk = []
            
            for line in content.split("\n"):
                if line.startswith("#") and current_chunk:
                    chunks.append("\n".join(current_chunk))
                    current_chunk = [line]
                else:
                    current_chunk.append(line)
            
            if current_chunk:
                chunks.append("\n".join(current_chunk))
                
            return [c for c in chunks if len(c.strip()) > 50]
            
        elif file_type == ".py":
            # Split by functions/classes
            chunks = []
            current_chunk = []
            
            for line in content.split("\n"):
                if (line.startswith("def ") or line.startswith("class ")) and current_chunk:
                    chunks.append("\n".join(current_chunk))
                    current_chunk = [line]
                else:
                    current_chunk.append(line)
            
            if current_chunk:
                chunks.append("\n".join(current_chunk))
                
            return [c for c in chunks if len(c.strip()) > 50]
        
        return [content]
    
    def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Search for relevant context using semantic similarity."""
        if not self.documents or len(self.embeddings) == 0:
            return []
        
        # Encode query
        query_embedding = self.model.encode([query])
        
        # Calculate similarities
        similarities = cosine_similarity(query_embedding, self.embeddings)[0]
        
        # Get top-k results
        top_indices = np.argsort(similarities)[::-1][:top_k]
        
        results = []
        for idx in top_indices:
            if similarities[idx] > 0.3:  # Threshold for relevance
                result = self.documents[idx].copy()
                result["score"] = float(similarities[idx])
                results.append(result)
        
        return results


# Example usage function
async def load_external_context() -> ContextLoader:
    """Load external context and return configured loader.
    
    This function demonstrates how to use the ContextLoader:
    
    ```python
    loader = await load_external_context()
    
    # Search for MCP server implementation details
    results = loader.search("MCP server implementation")
    
    for result in results:
        print(f"Score: {result['score']:.2f}")
        print(f"Source: {result['source']}/{result['file']}")
        print(f"Content: {result['content'][:200]}...")
        print("-" * 80)
    ```
    """
    loader = ContextLoader()
    await loader.load_external_context()
    return loader