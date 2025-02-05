import React from 'react';
import AgentCard from './AgentCard';
import { agents } from '../data/agents';

// Define the strict sequence of agents
const AGENT_SEQUENCE = [
  'longContextChunking',
  'jtbd',
  'jtbdGains',
  'painExtractor',
  'problemAwareness',
  'needsAnalysis',
  'demandAnalyst',
  'opportunityQualification',
  'finalReport'
];

const AgentSelection = ({
  onRunAgent,
  onViewResults,
  agentProgress = {},
  analyzingAgents = new Set(),
  localAnalysisResults = {},
  hasData = false,
  isDone
}) => {
  // Helper function to check if an agent can run
  const canRunAgent = (agentId) => {
    const debugState = {
      agentId,
      hasData,
      analyzingAgentsSize: analyzingAgents.size,
      currentAnalyzingAgents: Array.from(analyzingAgents),
      localResults: Object.keys(localAnalysisResults),
      agentProgress,
      isDoneStatus: isDone(agentId)
    };
    
    console.log(`🔍 DEBUG - Checking if agent ${agentId} can run:`, debugState);

    // Can't run if no data
    if (!hasData) {
      console.log(`❌ ${agentId}: No data available`);
      return false;
    }
    
    // Can't run if any agent is currently analyzing
    if (analyzingAgents.size > 0) {
      console.log(`❌ ${agentId}: Another agent is running:`, Array.from(analyzingAgents));
      return false;
    }

    // If it's already done, can't run again
    if (isDone(agentId)) {
      console.log(`❌ ${agentId}: Already completed`);
      return false;
    }

    // If it's the first agent (Long Context Chunking)
    if (agentId === 'longContextChunking') {
      console.log(`✅ ${agentId}: First agent can run`);
      return true;
    }

    // For all other agents
    const agent = agents.find(a => a.id === agentId);
    if (!agent) {
      console.error(`❌ ${agentId}: Agent not found in configuration`);
      return false;
    }

    // Check if prerequisite is completed
    if (agent.requiresPreviousAgent) {
      const prerequisiteDone = isDone(agent.requiresPreviousAgent);
      const prerequisiteResults = localAnalysisResults[agent.requiresPreviousAgent];
      
      console.log(`📋 ${agentId} prerequisite check:`, {
        prerequisiteAgent: agent.requiresPreviousAgent,
        prerequisiteDone,
        hasPrerequisiteResults: !!prerequisiteResults,
        prerequisiteResultKeys: prerequisiteResults ? Object.keys(prerequisiteResults) : [],
      });
      
      if (!prerequisiteDone || !prerequisiteResults) {
        console.log(`❌ ${agentId}: Prerequisites not met`);
        return false;
      }
    }
    
    console.log(`✅ ${agentId}: All checks passed, can run`);
    return true;
  };

  return (
    <div className="space-y-4">
      {agents.map((agent) => {
        const isAnalyzing = analyzingAgents.has(agent.id);
        const hasResults = isDone(agent.id);
        const isEnabled = canRunAgent(agent.id);
        const progress = agentProgress[agent.id] || 0;

        console.log(`AgentSelection: Rendering ${agent.id}`, {
          isAnalyzing,
          hasResults,
          isEnabled,
          progress,
          prerequisites: agent.requiresPreviousAgent ? {
            agentId: agent.requiresPreviousAgent,
            isDone: isDone(agent.requiresPreviousAgent)
          } : null
        });

        return (
          <AgentCard
            key={agent.id}
            agent={agent}
            progress={progress}
            onViewResults={() => onViewResults(agent.id)}
            onRunAgent={onRunAgent}
            isEnabled={isEnabled}
            hasData={hasData}
            isAnalyzing={isAnalyzing}
            hasResults={hasResults}
          />
        );
      })}
    </div>
  );
};

export default AgentSelection;