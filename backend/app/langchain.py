# backend/langchain.py
from flask import Flask, request, render_template_string
from langchain_community.document_loaders import Docx2txtLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
import google.generativeai as genai
import os
from langchain.prompts import PromptTemplate
from langchain_core.documents import Document

# -----------------------------
# Step 1: Load & Prepare Docs (Only first time)
# -----------------------------
DB_PATH = "faiss_index"
DOC_PATH = "backend/guidelines.txt"

if not os.path.exists(DB_PATH):
    print("⚡ Building new FAISS index...")
    with open("backend/guidelines.txt", "r", encoding="utf-8") as f:
        guidelines_text = f.read()

    # Wrap the text in a Document object
    documents = [Document(page_content=guidelines_text)]
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    chunks = splitter.split_documents(documents)

    embedding_model = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    vectorstore = FAISS.from_documents(chunks, embedding_model)
    vectorstore.save_local(DB_PATH)
else:
    print("✅ Loading FAISS index from disk...")
    embedding_model = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    vectorstore = FAISS.load_local(DB_PATH, embedding_model, allow_dangerous_deserialization=True)

# -----------------------------
# Step 2: Gemini Setup
# -----------------------------
   
gemini_model = genai.GenerativeModel("gemini-1.5-flash")

QA_PROMPT = PromptTemplate(
    template="""You are a helpful assistant. 
Use the following context to answer the question. 
If the answer is not in the context, just say "I don't know". 
Do not repeat the context. Only output the final answer.

Context:
{context}

Question: {question}
Answer:""",
    input_variables=["context", "question"],
)

# -----------------------------
# Step 3: Custom QA Function
# -----------------------------
retriever = vectorstore.as_retriever(search_type="similarity", search_kwargs={"k": 2})

def qa_chain(query: str):
    docs = retriever.get_relevant_documents(query)
    context = "\n".join([d.page_content for d in docs])

    prompt = QA_PROMPT.format(context=context, question=query)
    response = gemini_model.generate_content(prompt)
    return response.text.strip()


def resolve_issue_with_guidelines(issue_text: str) -> str:
    """
    Returns the AI-guided solution based on restaurant guidelines.
    """
    result = qa_chain(issue_text)
    return result
