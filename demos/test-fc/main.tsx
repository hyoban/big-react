import { useState } from "react"
import ReactDOM from "react-dom/client"

function Child() {
  const [num, setNum] = useState(1)

  const arr =
    num % 2 === 0
      ? [<li key="1">1</li>, <li key="2">2</li>, <li key="3">3</li>]
      : [<li key="3">3</li>, <li key="2">2</li>, <li key="1">1</li>]

  return (
    <ul onClickCapture={() => setNum(num + 1)}>
      <li>4</li>
      <li>5</li>
      {arr}
    </ul>
  )
}

function App() {
  return <Child />
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <App />,
)
