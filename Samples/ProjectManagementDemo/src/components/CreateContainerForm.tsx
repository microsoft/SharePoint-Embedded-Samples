
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { toast } from '@/hooks/use-toast';
import { sharePointService } from '../services/sharePointService';
import { useAuth } from '../context/AuthContext';

interface CreateContainerFormProps {
  onSuccess: (containerId?: string) => void;
  onCancel: () => void;
}

interface ContainerFormData {
  displayName: string;
  description: string;
  administrator: string;
}

export const CreateContainerForm: React.FC<CreateContainerFormProps> = ({ onSuccess, onCancel }) => {
  const { getAccessToken } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  
  const form = useForm<ContainerFormData>({
    defaultValues: {
      displayName: '',
      description: '',
      administrator: '',
    },
  });

  const onSubmit = async (data: ContainerFormData) => {
    try {
      setIsCreating(true);
      
      const token = await getAccessToken();
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Failed to get access token. Please try logging in again.",
          variant: "destructive",
        });
        return;
      }

      console.log('Creating container with data:', data);
      const newContainer = await sharePointService.createContainer(token, data.displayName, data.description);
      console.log('Container created successfully:', newContainer);
      
      toast({
        title: "Success",
        description: `Container "${data.displayName}" created successfully!`,
      });
      
      form.reset();
      
      // Pass the new container ID to the parent component
      onSuccess(newContainer.id);
    } catch (error: any) {
      console.error('Error creating container:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create container",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="displayName"
          rules={{ required: "Display name is required" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Name *</FormLabel>
              <FormControl>
                <Input placeholder="Enter container name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter optional description" 
                  rows={3}
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="administrator"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Administrator</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter administrator email" 
                  type="email"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isCreating}
          >
            {isCreating ? 'Creating...' : 'Create Container'}
          </Button>
        </div>
      </form>
    </Form>
  );
};
