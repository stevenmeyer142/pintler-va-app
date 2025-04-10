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


function App() {
 // const [todos, setTodos] = useState<Array<Schema["Todo"]["type"]>>([]);

 //const { signOut } = useAuthenticator();
function signOut() {
}

  // useEffect(() => {
  //   client.models.Todo.observeQuery().subscribe({
  //     next: (data) => setTodos([...data.items]),
  //   });
  // }, []);

  function createTodo() {
  //  client.models.Todo.create({ content: window.prompt("Todo content") });
  }
    
  // function deleteTodo(id: string) {
  // //  client.models.Todo.delete({ id })
  // }

  function goToVA() {
    // const hello = client.queries.sayHello({
    //   name: "Amplify",
    // });
    
    //fetch(outputs.custom.gatewayURL, {
    //   method: 'GET',
    //   headers: {
    //   'Content-Type': 'text/html',
    //   },
    // })
    //   .then(response => response.text())
    //   .then(data => {
    //   const parser = new DOMParser();
    //   const doc = parser.parseFromString(data, 'text/html');
    //   document.body.innerHTML = doc.body.innerHTML;
    //   // Handle success response
    //   })
    //   .catch(error => {
    //   console.error('Error:', error);
    //   // Handle error response
    //   });
     window.location.href = outputs.custom.gatewayURL;
  }

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

export default App;
