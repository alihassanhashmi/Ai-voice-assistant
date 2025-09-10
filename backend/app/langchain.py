# backend/langchain.py
from langchain_community.document_loaders import PyPDFLoader, TextLoader, Docx2txtLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
import google.generativeai as genai
import os
from langchain.prompts import PromptTemplate
from langchain_core.documents import Document

# -----------------------------
# Configuration
# -----------------------------
DB_PATH = "faiss_index"
DOC_PATH = "backend/guidelines.txt"

# Initialize components
embedding_model = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,  # Increased for better context
    chunk_overlap=200,  # Increased overlap for better continuity
    separators=["\n\n", "\n", " ", ""]  # Better splitting logic
)

# -----------------------------
# Vector Store Management
# -----------------------------
def initialize_vectorstore():
    """Initialize or load the vector store"""
    if not os.path.exists(DB_PATH):
        print("⚡ Building new FAISS index...")
        # Create from guidelines.txt
        if os.path.exists(DOC_PATH):
            with open(DOC_PATH, "r", encoding="utf-8") as f:
                guidelines_text = f.read()
            
            documents = [Document(page_content=guidelines_text)]
            chunks = text_splitter.split_documents(documents)
            
            vectorstore = FAISS.from_documents(chunks, embedding_model)
            vectorstore.save_local(DB_PATH)
            print(f"✅ Created index with {len(chunks)} chunks from guidelines.txt")
        else:
            # Create empty vectorstore if no guidelines file
            vectorstore = FAISS.from_texts(["Welcome to the restaurant assistant."], embedding_model)
            vectorstore.save_local(DB_PATH)
            print("✅ Created empty index (no guidelines.txt found)")
    else:
        print("✅ Loading FAISS index from disk...")
        vectorstore = FAISS.load_local(DB_PATH, embedding_model, allow_dangerous_deserialization=True)
    
    return vectorstore

# Initialize the vector store
vectorstore = initialize_vectorstore()
retriever = vectorstore.as_retriever(search_type="similarity", search_kwargs={"k": 3})  # Increased to 3 results

# -----------------------------
# Document Processing
# -----------------------------
def add_document_to_vectorstore(file_path: str):
    """Process uploaded document and add to existing vector store"""
    
    # Determine loader based on file type
    if file_path.endswith('.pdf'):
        loader = PyPDFLoader(file_path)
    elif file_path.endswith('.txt'):
        loader = TextLoader(file_path)
    elif file_path.endswith('.docx'):
        loader = Docx2txtLoader(file_path)
    else:
        raise ValueError("Unsupported file format. Please upload PDF, TXT, or DOCX files.")
    
    # Load and split document
    documents = loader.load()
    chunks = text_splitter.split_documents(documents)
    
    # Add to existing vector store
    global vectorstore
    vectorstore.add_documents(chunks)
    vectorstore.save_local(DB_PATH)
    
    return f"Added {len(chunks)} chunks from {os.path.basename(file_path)} to knowledge base"

# -----------------------------
# Gemini Setup
# -----------------------------
gemini_model = genai.GenerativeModel("gemini-1.5-flash")

QA_PROMPT = PromptTemplate(
    template="""You are a helpful restaurant assistant. Use the following context from our guidelines to answer the question. 
If the answer is not in the context, politely say you don't have that information but offer to help with other questions.

Context:
{context}

Question: {question}

Please provide a helpful and professional response:""",
    input_variables=["context", "question"],
)

# -----------------------------
# QA Functions
# -----------------------------
def qa_chain(query: str):
    """Enhanced QA chain with better context handling"""
    try:
        # Retrieve relevant documents
        docs = retriever.invoke(query)
        context = "\n\n".join([d.page_content for d in docs])
        
        # Generate response
        prompt = QA_PROMPT.format(context=context, question=query)
        response = gemini_model.generate_content(prompt)
        
        return response.text.strip()
    except Exception as e:
        return f"I apologize, but I'm having trouble accessing the information right now. Please try again later. Error: {str(e)}"

def resolve_issue_with_guidelines(issue_text: str) -> str:
    """
    Returns the AI-guided solution based on restaurant guidelines.
    """
    return qa_chain(issue_text)