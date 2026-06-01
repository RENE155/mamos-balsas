import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Child, CreateChildInput } from '@/types';

export function useChildren() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChildren = useCallback(async () => {
    if (!user) {
      setChildren([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('children')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setChildren(data || []);
    } catch (err) {
      console.error('Error fetching children:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch children');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  const createChild = async (input: CreateChildInput): Promise<Child> => {
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('children')
      .insert({
        user_id: user.id,
        ...input,
      })
      .select()
      .single();

    if (error) throw error;

    setChildren((prev) => [data, ...prev]);
    return data;
  };

  const updateChild = async (id: string, input: Partial<CreateChildInput>): Promise<Child> => {
    const { data, error } = await supabase
      .from('children')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    setChildren((prev) => prev.map((child) => (child.id === id ? data : child)));
    return data;
  };

  const deleteChild = async (id: string): Promise<void> => {
    const { error } = await supabase.from('children').delete().eq('id', id);

    if (error) throw error;

    setChildren((prev) => prev.filter((child) => child.id !== id));
  };

  const getChild = (id: string): Child | undefined => {
    return children.find((child) => child.id === id);
  };

  return {
    children,
    isLoading,
    error,
    fetchChildren,
    createChild,
    updateChild,
    deleteChild,
    getChild,
  };
}
