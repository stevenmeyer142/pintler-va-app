//import { useEffect, useState } from "react";
////import { useAuthenticator } from '@aws-amplify/ui-react';
//import { generateClient } from "aws-amplify/data";
import outputs from "../../amplify_outputs.json";
//import dotenv from 'dotenv';
import fs from 'fs';
// import { secret } from '@aws-amplify/backend';
// const clientId = secret('VA_Health_Client_ID');
// const clientSecret = secret('VA_Health_Client_Secret');

const envConfig = fs.readFileSync('.env', 'utf8')
  .split('\n')
  .filter(line => line && !line.startsWith('#'))
  .reduce((acc, line) => {
    const [key, value] = line.split('=');
    acc[key.trim()] = value.trim();
    return acc;
  }, {} as Record<string, string>);

const clientId = envConfig.CLIENT_ID || '';
const clientSecret = envConfig.CLIENT_SECRET || '';

c
//const client = generateClient<Schema>();

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
    const requestBody = JSON.stringify({ client_id: clientId, client_secret: clientSecret });

    fetch(outputs.custom.gatewayURL, {
      method: 'POST',
      headers: {
      'Content-Type': 'application/json',
      },
      body: requestBody,
    })
    .then(response => response.json())
    .then(data => {
      console.log('Success:', data);
      // Handle success response
    })
    .catch(error => {
      console.error('Error:', error);
      // Handle error response
    });
  //  window.location.href = `${outputs.custom.gatewayURL}?client_id=${clientId}&client_secret=${clientSecret}`;
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
