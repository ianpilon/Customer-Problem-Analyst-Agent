import React from 'react';
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const AgentCard = ({ 
  agent, 
  progress = 0, 
  onViewResults, 
  onRunAgent, 
  isEnabled,
  hasData,
  isAnalyzing = false,
  hasResults = false,
  className = ''
}) => {
  const getStatusBadge = () => {
    if (isAnalyzing) {
      return (
        <Badge 
          variant="outline" 
          className="text-slate-500 border-slate-200 bg-slate-50 flex items-center gap-1"
        >
          <Loader2 className="h-3 w-3 animate-spin" />
          Analysis in progress
        </Badge>
      );
    }
    
    if (hasResults) {
      return (
        <Badge 
          variant="outline" 
          className="text-blue-600 border-blue-200 bg-blue-50"
        >
          Analysis complete
        </Badge>
      );
    }

    if (isEnabled) {
      return (
        <Badge 
          variant="outline" 
          className="text-green-600 border-green-200 bg-green-50"
        >
          Ready to run
        </Badge>
      );
    }

    if (!hasData) {
      return (
        <Badge 
          variant="outline" 
          className="text-slate-500 border-slate-200 bg-slate-50"
        >
          Waiting for content upload
        </Badge>
      );
    }

    return (
      <Badge 
        variant="outline" 
        className="text-slate-500 border-slate-200 bg-slate-50"
      >
        Waiting for previous agent
      </Badge>
    );
  };

  const getActionButton = () => {
    if (hasResults) {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={onViewResults}
          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
        >
          View Results
        </Button>
      );
    }

    if (isEnabled && hasData && !isAnalyzing) {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            console.log('🎯 AgentCard: Run button clicked', {
              agentId: agent.id,
              isEnabled,
              hasData,
              isAnalyzing,
              agent,
              hasOnRunAgent: !!onRunAgent,
              onRunAgentType: typeof onRunAgent
            });
            
            if (!onRunAgent) {
              console.error('❌ onRunAgent is not defined');
              return;
            }
            
            if (!agent.id) {
              console.error('❌ agent.id is not defined', agent);
              return;
            }
            
            try {
              console.log('🚀 Calling onRunAgent with:', agent.id);
              onRunAgent(agent.id);
            } catch (error) {
              console.error('❌ Error running agent:', {
                error,
                agent,
                stack: error.stack
              });
            }
          }}
          className="text-green-600 bg-green-50 hover:bg-green-100"
        >
          Run this Agent
        </Button>
      );
    }

    return null;
  };

  return (
    <Card className={`flex flex-col p-4 ${className}`}>
      <div className="flex-grow">
        <CardTitle className="text-lg font-semibold">{agent.name}</CardTitle>
        <CardDescription className="text-sm text-gray-500 mt-1">
          {agent.description}
        </CardDescription>
      </div>

      <div className="mt-4 flex justify-between items-center min-h-[24px]">
        <div className="flex-grow">
          {getStatusBadge()}
          
          {isAnalyzing && (
            <div className="mt-2">
              <Progress 
                value={Math.max(2, progress)} 
                className="h-2 bg-slate-200" 
              />
            </div>
          )}
        </div>

        <div className="ml-4 flex-shrink-0">
          {getActionButton()}
        </div>
      </div>
    </Card>
  );
};

export default AgentCard;