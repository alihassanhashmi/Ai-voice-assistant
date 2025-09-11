import React, { useState, useRef, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { speak, listen } from "./utils/speech";
import axios from "axios";
import AdminOrders from "./components/AdminOrders"; // Changed from AdminPage to AdminOrders
import "./App.css"; // Optional: for styling


export default function App() {
  const [status, setStatus] = useState("idle");
  const [conversation, setConversation] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const orderInfoRef = useRef({});
  const [showAdmin, setShowAdmin] = useState(false); // Added missing state

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  const addMessage = (sender, text) => {
    setConversation((prev) => [...prev, { sender, text }]);
  };

  const normalizeInput = (text) => {
    text = text.toLowerCase().trim();
    const map = {
      one: "1",
      two: "2",
      three: "3",
      four: "4",
      for: "4",
      yes: "yes",
      no: "no",
      yeah: "yes",
      yep: "yes",
      nope: "no",
      nah: "no",
      sure: "yes",
      ok: "yes",
      okay: "yes",
      continue: "yes",
      stop: "no",
      end: "no",
      finish: "no",
      done: "no",
    };
    return map[text] || text;
  };

  const handleStart = async () => {
    setStatus("listening");
    const welcomeMsg = "Welcome! Say 1 to order, 2 to get Menu, 3 to make reservation, 4 for client issues.";
    addMessage("assistant", welcomeMsg);
    await speak(welcomeMsg);
    startListening();
  };

  const startListening = () => {
    listen(async (result) => {
      const normalized = normalizeInput(result);
      addMessage("user", result);

      if (normalized.includes("1") || normalized.includes("order")|| normalized.includes("one")) {
        handleOrderName();
      } else if (normalized.includes("2") || normalized.includes("menu")|| normalized.includes("two")) {
        handleMenuInquiry();
      } else if (normalized.includes("3") || normalized.includes("reservation") || normalized.includes("three") ) {
        handleReservation();
      } else if (normalized.includes("4") || normalized.includes("issue") || normalized.includes("four")) {
        handleClientIssue();
      } else {
        await speak("Didn't understand. Try again.");
        addMessage("assistant", "Didn't understand. Try again.");
        startListening();
      }
    }, (error) => {
      console.error(error);
      speak("Sorry, there was an error. Press Start again.");
      setStatus("idle");
    });
  };

  // ========================= ORDER FLOW =========================
    const handleOrderName = async () => {
    addMessage("assistant", "Please tell me your name for the order.");
    await speak("Please tell me your name for the order.");

    listen(async (name) => {
      addMessage("user", name);
      // Use useRef instead of useState
      orderInfoRef.current.name = name;
      handleOrderPhone();
    }, handleError("Order process aborted."));
  };

  const handleOrderPhone = async () => {
    addMessage("assistant", "Please tell me your phone number.");
    await speak("Please tell me your phone number.");

    listen(async (phone) => {
      addMessage("user", phone);
      // Use useRef instead of useState
      orderInfoRef.current.phone = phone;
      handleOrderItems();
    }, handleError("Order process aborted."));
  };

  const handleOrderItems = async () => {
    addMessage("assistant", "What would you like to order?");
    await speak("What would you like to order?");

    const addItem = () => {
      listen(async (item) => {
        const newOrderItems = [...orderItems, item];
        setOrderItems(newOrderItems);
        addMessage("user", item);

        const msg = `Added ${item}. Do you want to add another item? Say yes or no.`;
        addMessage("assistant", msg);
        await speak(msg);

        listen(async (answer) => {
          const normalized = normalizeInput(answer);
          addMessage("user", answer);

          if (normalized.includes("yes")) {
            await speak("What else would you like to order?");
            addItem();
          } else {
            // DEBUG: Check what's in orderInfoRef
            console.log("Current orderInfoRef:", orderInfoRef.current);
            console.log("Order items:", newOrderItems);
            
            // Validate that we have all required information
            if (!orderInfoRef.current.name || !orderInfoRef.current.phone) {
              addMessage("assistant", "I'm missing some information. Let's start over.");
              await speak("I'm missing some information. Let's start over.");
              setOrderItems([]);
              orderInfoRef.current = {};
              handleStart();
              return;
            }

            // Place order to backend
            try {
              const orderData = {
                customer_name: String(orderInfoRef.current.name),
                phone_number: String(orderInfoRef.current.phone),
                item: String(newOrderItems.join(", ")),
                quantity: Number(newOrderItems.length)
              };
              
              console.log("Sending order data:", orderData);
              
              const response = await axios.post("http://localhost:8000/order", orderData, {
                headers: {
                  'Content-Type': 'application/json'
                }
              });
              
              const orderNumber = response.data.order_id;
              const summary = `Your order is: ${newOrderItems.join(", ")}. Order number: #${orderNumber}.`;
              addMessage("assistant", summary);
              await speak(summary);

              // Reset order info
              setOrderItems([]);
              orderInfoRef.current = {};

              // Ask continue or stop
              const continueMsg = "Anything else I can help you with? Say yes or no.";
              addMessage("assistant", continueMsg);
              await speak(continueMsg);

              listen(async (answer) => {
                const normalizedAns = normalizeInput(answer);
                addMessage("user", answer);
                if (normalizedAns.includes("yes")) {
                  startListening();
                } else {
                  const goodbyeMsg = "Thank you for your order! Have a great day!";
                  addMessage("assistant", goodbyeMsg);
                  await speak(goodbyeMsg);
                  setStatus("idle");
                }
              }, handleError("Order process completed."));

            } catch (err) {
              console.error("Order error:", err.response?.data || err.message);
              const errorMsg = "Failed to place order. Please try again.";
              addMessage("assistant", errorMsg);
              await speak(errorMsg);
              setStatus("idle");
            }
          }
        }, handleError("Order process aborted."));
      }, handleError("Order process aborted."));
    };

    addItem();
  };
   // ========================= LOCATION =========================
  const handleMenuInquiry = async () => {
  const msg = "Sure! What would you like to know about our menu? You can ask about categories, specific dishes, prices, or dietary options.";
  addMessage("assistant", msg);
  await speak(msg);

  listen(async (menuQuestion) => {
    addMessage("user", menuQuestion);
    setStatus("processing...");

    try {
      // Send to backend for RAG processing
      const response = await axios.post("http://localhost:8000/menu-inquiry", {
        question: menuQuestion
      });
      
      const aiResponse = response.data.response;
      addMessage("assistant", aiResponse);
      await speak(aiResponse);
      
      // Ask if they want to know more
      const continueMsg = "Would you like to know anything else about our menu? Say yes or no.";
      addMessage("assistant", continueMsg);
      await speak(continueMsg);

      listen(async (answer) => {
        const normalized = normalizeInput(answer);
        addMessage("user", answer);
        
        if (normalized.includes("yes")) {
          handleMenuInquiry(); // Restart menu inquiry
        } else {
          const goodbyeMsg = "Great! Let me know if you need anything else.";
          addMessage("assistant", goodbyeMsg);
          await speak(goodbyeMsg);
          setStatus("idle");
        }
      }, handleError("Menu inquiry completed."));
      
    } catch (err) {
      console.error("Menu inquiry error:", err);
      const errorMsg = "Sorry, I couldn't process your menu question. Please try again.";
      addMessage("assistant", errorMsg);
      await speak(errorMsg);
      setStatus("idle");
    }
  }, handleError("Menu inquiry aborted."));
};
  // ========================= LOCATION =========================
  const handleLocation = async () => {
    const locationUrl = "https://www.google.com/maps/place/123+Main+Street,+City";
    const msg = "Our restaurant is located at 123 Main Street. Opening location in browser.";
    addMessage("assistant", msg);
    await speak(msg);
    window.open(locationUrl, "_blank");
    
    // Ask if user wants to continue
    const continueMsg = "Is there anything else I can help you with? Say yes or no.";
    addMessage("assistant", continueMsg);
    await speak(continueMsg);
    
    listen(
      async (answer) => {
        const normalizedAnswer = normalizeInput(answer);
        addMessage("user", answer);
        
        if (normalizedAnswer.includes("yes")) {
          startListening();
        } else {
          const goodbyeMsg = "Thank you for contacting us. Have a great day!";
          addMessage("assistant", goodbyeMsg);
          await speak(goodbyeMsg);
          setStatus("idle");
        }
      },
      handleError("Location process completed.")
    );
  };

  // ========================= RESERVATION =========================
  const handleReservation = async () => {
    const info = {};
    addMessage("assistant", "Please tell me your name.");
    await speak("Please tell me your name.");

    listen(async (name) => {
      info.name = name;
      addMessage("user", name);

      const msg1 = `Hello ${name}. How many people for the reservation?`;
      addMessage("assistant", msg1);
      await speak(msg1);

      listen(async (people) => {
        info.people = people;
        addMessage("user", people);

        const msg2 = "At what time would you like the reservation?";
        addMessage("assistant", msg2);
        await speak(msg2);

        listen(async (time) => {
          info.time = time;
          addMessage("user", time);

          // Send reservation to backend
          try {
            const response = await axios.post("http://localhost:8000/reservation", null, {
              params: {
                customer_name: info.name,
                time_slot: info.time, // Changed from datetime to time_slot
                people: parseInt(info.people) || 1
              }
            });
            
            const reservationNumber = response.data.reservation_id;
            const summary = `Reservation confirmed for ${info.name}, ${info.people} people at ${info.time}. Reservation number: #${reservationNumber}.`;
            addMessage("assistant", summary);
            await speak(summary);
            
            // Ask if user wants to continue
            const continueMsg = "Is there anything else I can help you with? Say yes or no.";
            addMessage("assistant", continueMsg);
            await speak(continueMsg);
            
            listen(
              async (answer) => {
                const normalizedAnswer = normalizeInput(answer);
                addMessage("user", answer);
                
                if (normalizedAnswer.includes("yes")) {
                  startListening();
                } else {
                  const goodbyeMsg = "Thank you for your reservation! Have a great day!";
                  addMessage("assistant", goodbyeMsg);
                  await speak(goodbyeMsg);
                  setStatus("idle");
                }
              },
              handleError("Reservation process completed.")
            );
          } catch (err) {
            console.error("Reservation error:", err.response?.data || err.message);
            const errorMsg = "Failed to create reservation. Please try again.";
            addMessage("assistant", errorMsg);
            await speak(errorMsg);
            setStatus("idle");
          }
        }, handleError("Reservation process aborted."));
      }, handleError("Reservation process aborted."));
    }, handleError("Reservation process aborted."));
  };

  // ========================= CLIENT ISSUE =========================
  const handleClientIssue = async () => {
    const msg = "Please tell me your issue or request.";
    addMessage("assistant", msg);
    await speak(msg);

    listen(async (issueText) => {
      const normalized = normalizeInput(issueText);
      addMessage("user", issueText);
      if (normalized.includes("order") && normalized.includes("cancel" || "update")) {
        handleOrderCancellationUpdate(issueText);
        return;
      }
      else if (normalized.includes("reservation") && normalized.includes("cancel")) {
        handleReservationCancellation(issueText);
        return;
      }
      // Handle general issues with RAG
      else {
        handleGeneralIssue(issueText);
        return;
      }

    }, (error) => {
      console.error(error);
      const errorMsg = "Issue process aborted.";
      addMessage("assistant", errorMsg);
      speak(errorMsg);
      setStatus("idle");
    });
  };

  const handleError = (msg) => async (error) => {
    console.error(error);
    addMessage("assistant", msg);
    await speak(msg);
    setStatus("idle");
  };

  // Handle order cancellation or update
const handleOrderCancellationUpdate = async (issueText) => {
  addMessage("assistant", "I can help you with your order issue. Please provide your order number.");
  await speak("I can help you with your order issue. Please provide your order number.");

  listen(async (orderNumberInput) => {
    addMessage("user", orderNumberInput);
    
    // Extract order number (remove non-digits)
    const orderNumber = orderNumberInput.replace(/\D/g, '');
    
    if (!orderNumber) {
      addMessage("assistant", "I couldn't find a valid order number. Please try again with your order number.");
      await speak("I couldn't find a valid order number. Please try again with your order number.");
      handleOrderCancellationUpdate(issueText);
      return;
    }

    // Ask for customer name for verification
    addMessage("assistant", "Please provide your name for verification.");
    await speak("Please provide your name for verification.");

    listen(async (customerName) => {
      addMessage("user", customerName);

      try {
        const lowerCaseIssue = issueText.toLowerCase();
        
        if (lowerCaseIssue.includes("cancel")) {
          // Cancel the order using customer endpoint with proper request body
          const response = await axios.patch(
            `http://localhost:8000/customer/orders/${orderNumber}/cancel`,
            { customer_name: customerName },
            {
              headers: {
                "Content-Type": "application/json"
              }
            }
          );
          
          addMessage("assistant", response.data.message || `Order #${orderNumber} has been successfully cancelled.`);
          await speak(response.data.message || `Order number ${orderNumber} has been successfully cancelled.`);
        } else if (lowerCaseIssue.includes("update")) {
          addMessage("assistant", "What would you like to update? Please describe the changes.");
          await speak("What would you like to update? Please describe the changes.");
          
          listen(async (updateDetails) => {
            addMessage("user", updateDetails);
            
            // For updates, we'll note the request since modifying orders is complex
            addMessage("assistant", `Update request for order #${orderNumber} has been noted: ${updateDetails}. Our team will contact you shortly.`);
            await speak(`Update request for order number ${orderNumber} has been noted. Our team will contact you shortly.`);
            
            // Ask if user wants to continue
            await askToContinue();
          }, handleError("Update process aborted."));
          
          return;
        }
        
        // Ask if user wants to continue
        await askToContinue();
        
      } catch (err) {
        console.error("Order modification error:", err);
        
        if (err.response?.status === 404) {
          addMessage("assistant", `Order #${orderNumber} not found. Please check your order number.`);
          await speak(`Order number ${orderNumber} not found. Please check your order number.`);
        } else if (err.response?.status === 403) {
          addMessage("assistant", "The order number doesn't match your name. Please verify your information.");
          await speak("The order number doesn't match your name. Please verify your information.");
        } else if (err.response?.status === 400) {
          addMessage("assistant", err.response.data.detail || "This order cannot be modified.");
          await speak(err.response.data.detail || "This order cannot be modified.");
        } else {
          addMessage("assistant", "Sorry, there was an error processing your request. Please try again later.");
          await speak("Sorry, there was an error processing your request. Please try again later.");
        }
        
        setStatus("idle");
      }
    }, handleError("Order process aborted."));
  }, handleError("Order process aborted."));
};


// Handle reservation cancellation
const handleReservationCancellation = async (issueText) => {
  addMessage("assistant", "I can help you cancel your reservation. Please provide your reservation number or name.");
  await speak("I can help you cancel your reservation. Please provide your reservation number or name."); // Added await

  listen(async (reservationInfo) => {
    addMessage("user", reservationInfo);
    
    try {
      // In a real system, you'd have a reservations endpoint
      addMessage("assistant", "Your reservation cancellation request has been received. Our team will process it shortly.");
      await speak("Your reservation cancellation request has been received. Our team will process it shortly."); // Added await
      
      // Ask if user wants to continue
      await askToContinue(); // Added await
      
    } catch (err) {
      console.error("Reservation cancellation error:", err);
      addMessage("assistant", "Sorry, there was an error processing your cancellation request. Please try again later.");
      await speak("Sorry, there was an error processing your cancellation request. Please try again later."); // Added await
      setStatus("idle");
    }
  }, handleError("Reservation process aborted."));
};

// Handle general issues with RAG
const handleGeneralIssue = async (issueText) => {
  addMessage("assistant", "Let me check that for you.");
  await speak("Let me check that for you."); // Added await
  try {
    const response = await axios.post("http://localhost:8000/resolve-issue", {
      text: issueText,
    });
    const aiResponse = response.data.response;
    addMessage("assistant", aiResponse);
    await speak(aiResponse); // Added await
    
    // Ask if user wants to continue
    askToContinue(); // Added await
    
  } catch (err) {
    console.error(err);
    const errorMsg = "Sorry, could not resolve the issue at this time. Please try again later.";
    addMessage("assistant", errorMsg);
    await speak(errorMsg); // Added await
    
    // Ask if user wants to try again
    const tryAgainMsg = "Would you like to try explaining your issue again? Say yes or no.";
    addMessage("assistant", tryAgainMsg);
    await speak(tryAgainMsg); // Added await
    
    listen(
      async (answer) => {
        const normalizedAnswer = normalizeInput(answer);
        addMessage("user", answer);
        
        if (normalizedAnswer.includes("yes")) {
          handleClientIssue();
        } else {
          const goodbyeMsg = "I apologize for the inconvenience. Please feel free to contact us again if you need further assistance.";
          addMessage("assistant", goodbyeMsg);
          await speak(goodbyeMsg); // Added await
          setStatus("idle");
        }
      },
      (error) => {
        console.error(error);
        const errorMsg = "Issue process aborted.";
        addMessage("assistant", errorMsg);
        speak(errorMsg);
        setStatus("idle");
      }
    );
  }
};

// Helper function to ask if user wants to continue
const askToContinue = async () => {
  const continueMsg = "Is there anything else I can help you with? Say yes or no.";
  addMessage("assistant", continueMsg);
  await speak(continueMsg); // Added await
  
  listen(
    async (answer) => {
      const normalizedAnswer = normalizeInput(answer);
      addMessage("user", answer);
      
      if (normalizedAnswer.includes("yes")) {
        startListening();
      } else {
        const goodbyeMsg = "Thank you for contacting us. Have a great day!";
        addMessage("assistant", goodbyeMsg);
        await speak(goodbyeMsg); // Added await
        setStatus("idle");
      }
    },
    (error) => {
      console.error(error);
      const errorMsg = "Sorry, I didn't understand. Please press Start again if you need further assistance.";
      addMessage("assistant", errorMsg);
      speak(errorMsg);
      setStatus("idle");
    }
  );
};



  // Voice Assistant Component
 const VoiceAssistant = () => {
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  return (
    <div style={{ 
      padding: "2rem", 
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      minHeight: "100vh",
      backgroundColor: "#ffffff",
      color: "#1a1a1a",
      transition: "all 0.3s ease"
    }}>
      
      {/* Header with Logo and Navigation */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "3rem",
        paddingBottom: "1.5rem",
        borderBottom: "1px solid #f0f0f0"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{
            width: "40px",
            height: "40px",
            backgroundColor: "#000",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: "bold",
            fontSize: "1.2rem"
          }}>
            SS
          </div>
          <h1 style={{ 
            margin: 0, 
            fontSize: "1.8rem", 
            fontWeight: 400,
            letterSpacing: "-0.02em"
          }}>
            Sonic Savor
          </h1>
        </div>

        {/* Navigation Icons */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {/* Settings Gear Icon */}
          <span
            onClick={() => setShowSettingsMenu(!showSettingsMenu)}
            style={{
              fontSize: "1.5rem",
              cursor: "pointer",
              padding: "0.75rem",
              borderRadius: "50%",
              transition: "all 0.3s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "50px",
              height: "50px"
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = "#f8f8f8"}
            onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
          >
            ⚙️
          </span>
        </div>
      </div>

      {/* Settings Dropdown */}
      {showSettingsMenu && (
        <div style={{
          position: "fixed",
          top: "78px",
          right: "14.5rem",
          backgroundColor: "rgba(0, 0, 0, 0.02)",
          border: "1px solid #f0f0f0",
          borderRadius: "12px",
          padding: "0.0rem",
          boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
          zIndex: 1000,
          minWidth: "200px"
        }}>
          <Link 
            to="/admin" 
            style={{ 
              display: "block", 
              padding: "0.75rem 1rem", 
              textDecoration: "none", 
              color: "#ffffffff",
              borderRadius: "8px",
              transition: "background-color 0.2s"
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = "#7d7d7dff"}
            onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
            onClick={() => setShowSettingsMenu(false)}
          >
            Admin Page
          </Link>
        </div>
      )}

      {/* Main Content */}
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        {/* Welcome Message */}
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h2 style={{ 
            fontSize: "2.5rem", 
            fontWeight: 300, 
            margin: "0 0 1rem 0",
            letterSpacing: "-0.02em"
          }}>
            Welcome to Sonic Savor
          </h2>
          <p style={{ 
            color: "#666", 
            fontSize: "1.1rem",
            lineHeight: 1.6,
            margin: 0
          }}>
            Your voice-powered dining experience. Speak naturally to order, 
            make reservations, or get assistance.
          </p>
        </div>

        {/* Start Button */}
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <button 
            onClick={handleStart}
            style={{ 
              padding: "1.25rem 3rem",
              fontSize: "1.1rem",
              backgroundColor: "#000",
              color: "#fff",
              border: "none",
              borderRadius: "50px",
              cursor: "pointer",
              transition: "all 0.3s ease",
              fontWeight: 500
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#333";
              e.target.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "#000";
              e.target.style.transform = "translateY(0)";
            }}
          >
            Start Voice Assistant
          </button>
        </div>

        {/* Conversation Container */}
        <div style={{ 
          backgroundColor: "#fafafa",
          borderRadius: "16px",
          padding: "2rem",
          minHeight: "400px",
          border: "1px solid #f0f0f0"
        }}>
          <div style={{ 
            height: "400px", 
            overflowY: "auto",
            paddingRight: "1rem"
          }}>
            <style>
              {`
                ::-webkit-scrollbar {
                  width: 4px;
                }
                ::-webkit-scrollbar-track {
                  background: #f1f1f1;
                  border-radius: 10px;
                }
                ::-webkit-scrollbar-thumb {
                  background: #ddd;
                  border-radius: 10px;
                }
                ::-webkit-scrollbar-thumb:hover {
                  background: #ccc;
                }
              `}
            </style>
            
            {conversation.length === 0 ? (
              <div style={{ 
                textAlign: "center", 
                color: "#999",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <p>Start a conversation to see messages here</p>
              </div>
            ) : (
              conversation.map((msg, idx) => (
                <div key={idx} style={{ 
                  margin: "1rem 0",
                  padding: "1rem",
                  backgroundColor: msg.sender === "assistant" ? "#f8f8f8" : "transparent",
                  borderRadius: "12px",
                  border: msg.sender === "user" ? "1px solid #f0f0f0" : "none"
                }}>
                  <strong style={{ 
                    color: msg.sender === "assistant" ? "#666" : "#000",
                    fontSize: "0.9rem",
                    display: "block",
                    marginBottom: "0.5rem"
                  }}>
                    {msg.sender === "assistant" ? "AI" : "You"}:
                  </strong>
                  <div style={{ color: "#1a1a1a", lineHeight: 1.5 }}>
                    {msg.text}
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Status Indicator */}
        <div style={{ 
          marginTop: "1.5rem",
          textAlign: "center",
          color: "#666",
          fontSize: "0.9rem"
        }}>
          <strong>Status:</strong> {status}
        </div>
      </div>

      {/* Click outside to close settings menu */}
      {showSettingsMenu && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => setShowSettingsMenu(false)}
        />
      )}
    </div>
  );
};

  return (
    <Router>
      <Routes>
        <Route path="/" element={<VoiceAssistant />} />
        <Route path="/admin" element={<AdminOrders />} /> {/* Changed from AdminPage to AdminOrders */}
      </Routes>
    </Router>
  );
}