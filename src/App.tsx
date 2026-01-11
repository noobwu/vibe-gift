import React from 'react'
import { Layout } from 'antd'
import GiftGenerator from './components/GiftGenerator'
import './styles/App.css'

const { Header, Content } = Layout

const App: React.FC = () => {
  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <h1 className="app-title">🎁 送礼灵感生成器</h1>
      </Header>
      <Content className="app-content">
        <GiftGenerator />
      </Content>
    </Layout>
  )
}

export default App
