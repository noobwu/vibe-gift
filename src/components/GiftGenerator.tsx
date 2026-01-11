import React, { useState, useEffect } from 'react'
import {
  Card,
  Form,
  Input,
  Select,
  InputNumber,
  Button,
  Space,
  Typography,
  Divider,
  Row,
  Col,
  Spin,
  message,
  Collapse,
  Tag,
} from 'antd'
import {
  GiftOutlined,
  ReloadOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons'
import type { FormProps } from 'antd'

const { Title, Text, Paragraph } = Typography
const { Option } = Select
const { Panel } = Collapse

interface GiftItem {
  name: string
  feature: string
}

interface ApiConfig {
  apiUrl: string
  apiKey: string
  model: string
}

const GiftGenerator: React.FC = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [gifts, setGifts] = useState<GiftItem[]>([])
  const [apiConfig, setApiConfig] = useState<ApiConfig>({
    apiUrl: 'https://api.siliconflow.cn/v1/chat/completions',
    apiKey: '',
    model: 'Pro/deepseek-ai/DeepSeek-V3.2',
  })

  // 从localStorage加载API配置
  useEffect(() => {
    const savedConfig = localStorage.getItem('giftApiConfig')
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig)
        setApiConfig(config)
      } catch (e) {
        console.error('Failed to load API config:', e)
      }
    }
  }, [])

  // 保存API配置到localStorage
  const saveApiConfig = (config: ApiConfig) => {
    localStorage.setItem('giftApiConfig', JSON.stringify(config))
    setApiConfig(config)
    message.success('API配置已保存')
  }

  // 解析LLM返回的礼物推荐
  const parseGiftRecommendations = (content: string): GiftItem[] => {
    const gifts: GiftItem[] = []
    const lines = content.split('\n').filter((line) => line.trim())

    lines.forEach((line) => {
      // 匹配格式：1. [礼物名称] - [特点] 或 1．[礼物名称] - [特点]
      const match = line.match(/^\d+[\.．]\s*(.+?)\s*[-–—]\s*(.+)$/)
      if (match) {
        gifts.push({
          name: match[1].trim(),
          feature: match[2].trim(),
        })
      }
    })

    return gifts.length > 0 ? gifts : []
  }

  // 生成礼物推荐
  const generateGifts: FormProps['onFinish'] = async (values) => {
    if (!apiConfig.apiKey) {
      message.error('请先配置API Key')
      return
    }

    setLoading(true)
    setGifts([])

    try {
      const { gender, age, interests, budgetMin, budgetMax } = values

      // 构建用户输入内容
      let userContent = `性别：${gender} | 年龄：${age}岁`
      if (interests) {
        userContent += ` | 兴趣：${interests}`
      }
      userContent += ` | 预算：${budgetMin}-${budgetMax}元`

      const systemPrompt = `**角色**：你是一个专业的礼物挑选助手，擅长根据用户提供的简单信息，给出符合预算、有创意且适合收礼人的礼物推荐。

**任务**：基于用户输入的 **性别、年龄、兴趣爱好、预算范围**，生成 **3个礼物选项**，确保推荐：
1． **符合预算**（严格在用户设定的价格区间内）。
2． **贴合兴趣**（若用户提供了兴趣关键词，优先匹配）。
3． **多样化**（避免同类重复，如不推荐3个"杯子"）。
4． **简洁描述**（每个推荐用 **10字以内** 概括，如"复古蓝牙音箱"）。

**输出格式**（严格遵循）：
1． [礼物1名称] - [简短特点，如"科技感"]
2． [礼物2名称] - [简短特点，如"手工定制"]
3． [礼物3名称] - [简短特点，如"小众文艺"]

**限制规则**：
- 不推荐具体品牌或商品链接。
- 不涉及医疗、宗教、政治等敏感领域。
- 若用户未提供兴趣，按年龄和性别默认推荐（如年轻人→"创意小物"，长辈→"实用礼品"）。

**示例输入**：
- 性别：女 | 年龄：25 | 兴趣：阅读、咖啡 | 预算：100-200元

**示例输出**：
1． 定制书名咖啡杯 - 文艺暖心
2． 迷你手冲咖啡套装 - 精致生活
3． 复古皮质书签 - 优雅实用`

      const response = await fetch(apiConfig.apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: apiConfig.model,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: userContent,
            },
          ],
          stream: false,
          max_tokens: 512,
          enable_thinking: false,
        }),
      })

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.choices && data.choices[0] && data.choices[0].message) {
        const content = data.choices[0].message.content
        const parsedGifts = parseGiftRecommendations(content)

        if (parsedGifts.length > 0) {
          setGifts(parsedGifts)
          message.success('礼物推荐生成成功！')
        } else {
          message.warning('未能解析礼物推荐，请检查API返回格式')
          console.log('API返回内容:', content)
        }
      } else {
        throw new Error('API返回格式异常')
      }
    } catch (error: any) {
      console.error('生成礼物推荐失败:', error)
      message.error(error.message || '生成礼物推荐失败，请检查API配置')
    } finally {
      setLoading(false)
    }
  }

  // 重新生成
  const regenerateGifts = () => {
    form.submit()
  }

  return (
    <div className="gift-generator">
      <Row gutter={[24, 24]} justify="center">
        <Col xs={24} sm={24} md={20} lg={16} xl={14}>
          <Card className="config-card">
            <Collapse ghost>
              <Panel
                header={
                  <Space>
                    <SettingOutlined />
                    <Text strong>API配置</Text>
                  </Space>
                }
                key="1"
              >
                <Form layout="vertical" size="middle">
                  <Form.Item label="API URL">
                    <Input
                      value={apiConfig.apiUrl}
                      onChange={(e) =>
                        setApiConfig({ ...apiConfig, apiUrl: e.target.value })
                      }
                      placeholder="https://api.siliconflow.cn/v1/chat/completions"
                    />
                  </Form.Item>
                  <Form.Item label="API Key">
                    <Input.Password
                      value={apiConfig.apiKey}
                      onChange={(e) =>
                        setApiConfig({ ...apiConfig, apiKey: e.target.value })
                      }
                      placeholder="请输入API Key"
                    />
                  </Form.Item>
                  <Form.Item label="Model">
                    <Input
                      value={apiConfig.model}
                      onChange={(e) =>
                        setApiConfig({ ...apiConfig, model: e.target.value })
                      }
                      placeholder="Qwen/Qwen3-8B"
                    />
                  </Form.Item>
                  <Button
                    type="primary"
                    onClick={() => saveApiConfig(apiConfig)}
                  >
                    保存配置
                  </Button>
                </Form>
              </Panel>
            </Collapse>
          </Card>
        </Col>

        <Col xs={24} sm={24} md={20} lg={16} xl={14}>
          <Card className="form-card">
            <Title level={3}>
              <UserOutlined /> 收礼人信息
            </Title>
            <Form
              form={form}
              layout="vertical"
              onFinish={generateGifts}
              size="large"
            >
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="gender"
                    label="性别"
                    rules={[{ required: true, message: '请选择性别' }]}
                  >
                    <Select placeholder="请选择性别">
                      <Option value="男">男</Option>
                      <Option value="女">女</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="age"
                    label="年龄"
                    rules={[{ required: true, message: '请输入年龄' }]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="请输入年龄"
                      min={1}
                      max={120}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="interests" label="兴趣爱好（可选）">
                <Input
                  placeholder="例如：阅读、咖啡、摄影、运动等"
                  allowClear
                />
              </Form.Item>

              <Divider>预算设置</Divider>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="budgetMin"
                    label="最低预算（元）"
                    rules={[{ required: true, message: '请输入最低预算' }]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="最低预算"
                      min={0}
                      precision={0}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="budgetMax"
                    label="最高预算（元）"
                    rules={[
                      { required: true, message: '请输入最高预算' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('budgetMin') <= value) {
                            return Promise.resolve()
                          }
                          return Promise.reject(
                            new Error('最高预算必须大于最低预算')
                          )
                        },
                      }),
                    ]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="最高预算"
                      min={0}
                      precision={0}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<GiftOutlined />}
                  loading={loading}
                  block
                  size="large"
                >
                  生成礼物推荐
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {gifts.length > 0 && (
          <Col xs={24} sm={24} md={20} lg={16} xl={14}>
            <Card className="result-card">
              <div className="result-header">
                <Title level={3}>
                  <GiftOutlined /> 推荐礼物
                </Title>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={regenerateGifts}
                  loading={loading}
                >
                  换一批
                </Button>
              </div>
              <Divider />
              {loading ? (
                <div className="loading-container">
                  <Spin size="large" />
                  <Paragraph className="loading-text">
                    正在生成新的推荐...
                  </Paragraph>
                </div>
              ) : (
                <Row gutter={[16, 16]}>
                  {gifts.map((gift, index) => (
                    <Col xs={24} sm={12} md={8} key={index}>
                      <Card
                        className="gift-item-card"
                        hoverable
                        bordered
                      >
                        <div className="gift-number">{index + 1}</div>
                        <Title level={4} className="gift-name">
                          {gift.name}
                        </Title>
                        <Tag color="blue" className="gift-feature">
                          {gift.feature}
                        </Tag>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </Card>
          </Col>
        )}
      </Row>
    </div>
  )
}

export default GiftGenerator
