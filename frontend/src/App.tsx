//import { useEffect, useState } from "react";
////import { useAuthenticator } from '@aws-amplify/ui-react';
// import type { Schema } from "../../amplify/data/resource"
 import { Amplify } from "aws-amplify"
// import { generateClient } from "aws-amplify/data";
import outputs from "../../amplify_outputs.json";
//import dotenv from 'dotenv';
//import fs from 'fs';
// import { secret } from '@aws-amplify/backend';
// const clientId = secret('VA_Health_Client_ID');
// const clientSecret = secret('VA_Health_Client_Secret');

// //const clientSecret = envConfig.CLIENT_SECRET || '';

Amplify.configure(outputs)
//const client = generateClient<Schema>();
// const clientId = "clent_id";
// const clientSecret = "client_secret";
import { BrowserRouter as Router, Route, Routes, useSearchParams } from "react-router-dom";

  function createTodo() {
  //  client.models.Todo.create({ content: window.prompt("Todo content") });
  }

  function DisplayPatient() {
    const [searchParams] = useSearchParams();
    const patientId = searchParams.get("patientId");
    const patientName = searchParams.get("patientName");
  
    return (
      <div>
        <h1>Patient Details</h1>
        <p><strong>Patient ID:</strong> {patientId || "Not provided"}</p>
        <p><strong>Patient Name:</strong> {patientName || "Not provided"}</p>
      </div>
    );
  }
  
  function goToVA() {
    
      const requestBody = {
        main_location: window.location.href,
      };

      fetch(`${outputs.custom.gatewayURL}set_session_values`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })
        .then((response) => {
          if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}`);
          }
          else {
          window.location.href = outputs.custom.gatewayURL;
        }
        })
        .catch((error) => {
          console.error("Error during fetch:", error);
        });


    }

 
 
function App() {
 // const [todos, setTodos] = useState<Array<Schema["Todo"]["type"]>>([]);

 //const { signOut } = useAuthenticator();
function signOut() {
}

function DisplayMain() {
  return (
    <main>
      <button onClick={goToVA}>Login to VA</button>

      <h1>My todos</h1>
      <button onClick={createTodo}>+ new</button>
        <div>
        🥳 App successfully hosted. Try creating a new todo.
        <br />
        <a href="https://docs.amplify.aws/react/start/quickstart/#make-frontend-updates">
          Review next step of this tutorial.
        </a>
      </div>
      <button onClick={signOut}>Sign out</button>
    </main>
  );
}


  // useEffect(() => {
  //   client.models.Todo.observeQuery().subscribe({
  //     next: (data) => setTodos([...data.items]),
  //   });
  // }, []);

    
  // function deleteTodo(id: string) {
  // //  client.models.Todo.delete({ id })
  // }

 


  return (
    <Router>
      <Routes>
        <Route path="/" element={<DisplayMain />}/>
        <Route path="/display_patient" element={<DisplayPatient />} />
      </Routes>
    </Router>
  );
}

export default App;
