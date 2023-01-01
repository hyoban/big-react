import { useState } from 'react'
import ReactDOM from 'react-dom/client'

function Child() {
  const [num, setNum] = useState(1)
  return num > 3 ? <span>hello big-react</span> : <div onClick={ () => setNum(num + 1)}>{num}</div>
}

function App() {
  return <Child />
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<App />,
)
