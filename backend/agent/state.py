from typing import List, Dict, Any, Optional, Literal
from typing_extensions import TypedDict
from pydantic import BaseModel, Field

IntentType = Literal["query_and_viz", "query_only", "conversational"]
ChartType = Literal["bar", "line", "area", "pie"]

class ChartSeries(BaseModel):
    key: str
    label: str
    color: Optional[str] = None

class ChartConfig(BaseModel):
    chartType: ChartType
    title: str
    description: Optional[str] = ""
    xAxisKey: str
    yAxisKeys: List[ChartSeries]
    data: List[Dict[str, Any]] = Field(default_factory=list)

class AgentStep(BaseModel):
    node: Literal["supervisor", "sql_agent", "viz_agent", "synthesizer"]
    label: str
    status: Literal["pending", "running", "completed", "error"]
    detail: Optional[str] = None
    timestamp: float = Field(default_factory=lambda: 0.0)

class AgentState(TypedDict, total=False):
    messages: List[Any]
    user_query: str
    intent: Optional[IntentType]
    sql_query: Optional[str]
    sql_error: Optional[str]
    sql_retry_count: int
    query_results: Optional[List[Dict[str, Any]]]
    columns: Optional[List[str]]
    execution_time_ms: Optional[int]
    chart_config: Optional[Dict[str, Any]]
    explanation: Optional[str]
    steps: List[Dict[str, Any]]
