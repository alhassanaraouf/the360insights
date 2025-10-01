import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from "recharts";

interface PerformanceChartProps {
  data: any[];
  type: 'line' | 'area' | 'radar' | 'bar' | 'pie';
  height?: number;
  colors?: string[];
  title?: string;
  xKey?: string;
  yKey?: string;
  className?: string;
}

const defaultColors = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16'  // Lime
];

export default function PerformanceChart({ 
  data, 
  type, 
  height = 300, 
  colors = defaultColors,
  title,
  xKey = 'month',
  yKey = 'value',
  className = ''
}: PerformanceChartProps) {
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey}: {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
              {entry.dataKey.includes('Rate') || entry.dataKey.includes('Score') ? '%' : ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey={xKey} 
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <Tooltip content={<CustomTooltip />} />
            {data.length > 0 && Object.keys(data[0])
              .filter(key => key !== xKey && typeof data[0][key] === 'number')
              .map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[index % colors.length]}
                  strokeWidth={2}
                  dot={{ fill: colors[index % colors.length], strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, stroke: colors[index % colors.length], strokeWidth: 2 }}
                />
              ))}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey={xKey} 
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <Tooltip content={<CustomTooltip />} />
            {data.length > 0 && Object.keys(data[0])
              .filter(key => key !== xKey && typeof data[0][key] === 'number')
              .map((key, index) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stackId="1"
                  stroke={colors[index % colors.length]}
                  fill={colors[index % colors.length]}
                  fillOpacity={0.6}
                />
              ))}
          </AreaChart>
        );

      case 'radar':
        return (
          <RadarChart data={data}>
            <PolarGrid gridType="polygon" radialLines={true} />
            <PolarAngleAxis 
              tick={{ fontSize: 12 }}
              dataKey={xKey}
            />
            <PolarRadiusAxis 
              tick={{ fontSize: 10 }}
              tickCount={5}
              domain={[0, 100]}
            />
            <Tooltip content={<CustomTooltip />} />
            {data.length > 0 && Object.keys(data[0])
              .filter(key => key !== xKey && typeof data[0][key] === 'number')
              .map((key, index) => (
                <Radar
                  key={key}
                  name={key}
                  dataKey={key}
                  stroke={colors[index % colors.length]}
                  fill={colors[index % colors.length]}
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              ))}
          </RadarChart>
        );

      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey={xKey} 
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <Tooltip content={<CustomTooltip />} />
            {data.length > 0 && Object.keys(data[0])
              .filter(key => key !== xKey && typeof data[0][key] === 'number')
              .map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={colors[index % colors.length]}
                  radius={[2, 2, 0, 0]}
                />
              ))}
          </BarChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              dataKey={yKey}
              nameKey={xKey}
              cx="50%"
              cy="50%"
              outerRadius={Math.min(height * 0.4, 120)}
              label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold mb-4 text-gray-900">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}