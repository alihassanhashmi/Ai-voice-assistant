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
  const [orderInfo, setOrderInfo] = useState({});
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
    const welcomeMsg = "Welcome! Say 1 to order, 2 to get location, 3 to make reservation, 4 for client issues.";
    addMessage("assistant", welcomeMsg);
    await speak(welcomeMsg);
    startListening();
  };

  const startListening = () => {
    listen(async (result) => {
      const normalized = normalizeInput(result);
      addMessage("user", result);

      if (normalized.includes("1") || normalized.includes("order")) {
        handleOrderName();
      } else if (normalized.includes("2") || normalized.includes("location")) {
        handleLocation();
      } else if (normalized.includes("3") || normalized.includes("reservation")) {
        handleReservation();
      } else if (normalized.includes("4") || normalized.includes("issue")) {
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
      setOrderInfo({ name });
      handleOrderPhone();
    }, handleError("Order process aborted."));
  };

  const handleOrderPhone = async () => {
    addMessage("assistant", "Please tell me your phone number.");
    await speak("Please tell me your phone number.");

    listen(async (phone) => {
      addMessage("user", phone);
      setOrderInfo((prev) => ({ ...prev, phone }));
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
            // Place order to backend - FIXED: Ensure proper data types
            try {
              const orderData = {
                customer_name: String(orderInfo.name),
                phone_number: String(orderInfo.phone),
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
              setOrderInfo({});

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
  await speak("I can help you with your order issue. Please provide your order number."); // Added await

  listen(async (orderNumberInput) => {
    addMessage("user", orderNumberInput);
    
    // Extract order number (remove non-digits)
    const orderNumber = orderNumberInput.replace(/\D/g, '');
    
    if (!orderNumber) {
      addMessage("assistant", "I couldn't find a valid order number. Please try again with your order number.");
      await speak("I couldn't find a valid order number. Please try again with your order number."); // Added await
      handleOrderCancellationUpdate(issueText);
      return;
    }

    try {
      // Check if order exists and can be modified
      const response = await axios.get(`http://localhost:8000/admin/orders`);
      const orders = response.data.orders;
      const order = orders.find(o => o.id === parseInt(orderNumber));
      
      if (!order) {
        addMessage("assistant", `Order #${orderNumber} not found. Please check your order number.`);
        await speak(`Order number ${orderNumber} not found. Please check your order number.`); // Added await
        return;
      }

      // Check if order can be modified (within 5 minutes)
      const orderDate = new Date(order.created_at);
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60000);
      
      if (orderDate < fiveMinutesAgo) {
        addMessage("assistant", `Sorry, order #${orderNumber} was placed more than 5 minutes ago and cannot be modified.`);
        await speak(`Sorry, order number ${orderNumber} was placed more than 5 minutes ago and cannot be modified.`); // Added await
        return;
      }

      // Determine action (cancel or update)
      const lowerCaseIssue = issueText.toLowerCase();
      if (lowerCaseIssue.includes("cancel")) {
        // Cancel the order
        await axios.patch(`http://localhost:8000/admin/orders/${orderNumber}`, {
          status: "canceled"
        });
        
        addMessage("assistant", `Order #${orderNumber} has been successfully cancelled.`);
        await speak(`Order number ${orderNumber} has been successfully cancelled.`); // Added await
      } else if (lowerCaseIssue.includes("update")) {
        addMessage("assistant", "What would you like to update? Please describe the changes.");
        await speak("What would you like to update? Please describe the changes."); // Added await
        
        listen(async (updateDetails) => {
          addMessage("user", updateDetails);
          
          // For simplicity, we'll just note the update request
          addMessage("assistant", `Update request for order #${orderNumber} has been noted: ${updateDetails}. Our team will contact you shortly.`);
          await speak(`Update request for order number ${orderNumber} has been noted. Our team will contact you shortly.`); // Added await
          
          // Ask if user wants to continue
          await askToContinue(); // Added await
        }, handleError("Update process aborted."));
        
        return;
      }
      
      // Ask if user wants to continue
      await askToContinue(); // Added await
      
    } catch (err) {
      console.error("Order modification error:", err);
      addMessage("assistant", "Sorry, there was an error processing your request. Please try again later.");
      await speak("Sorry, there was an error processing your request. Please try again later."); // Added await
      setStatus("idle");
    }
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
  const VoiceAssistant = () => (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <h1>AI Voice Assistant</h1>
      
      <div style={{ marginBottom: "1rem" }}>
        <button onClick={handleStart} style={{ padding: "1rem 2rem", fontSize: "1.2rem", marginRight: "1rem" }}>
          Start
        </button>
        <Link to="/admin" style={{ padding: "1rem 2rem", fontSize: "1.2rem", backgroundColor: "#555", color: "white", textDecoration: "none", display: "inline-block" }}>
          Admin Dashboard
        </Link>
      </div>

      <div style={{ marginTop: "2rem", height: "400px", overflowY: "auto", backgroundColor: "#000", color: "#fff", border: "1px solid #fff", padding: "1rem" }}>
        {conversation.map((msg, idx) => (
          <div key={idx} style={{ margin: "0.5rem 0" }}>
            <strong>{msg.sender === "assistant" ? "AI" : "You"}:</strong> {msg.text}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div style={{ marginTop: "1rem" }}>
        <strong>Status:</strong> {status}
      </div>
    </div>
  );

  return (
    <Router>
      <Routes>
        <Route path="/" element={<VoiceAssistant />} />
        <Route path="/admin" element={<AdminOrders />} />
      </Routes>
    </Router>
  );
}