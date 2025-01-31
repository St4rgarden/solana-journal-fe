'use client'

import { getJournalProgram, getJournalProgramId } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { Cluster, PublicKey } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import toast from 'react-hot-toast'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../ui/ui-layout'

interface EntryArgs {
  owner: PublicKey,
  title: string,
  message: string,
};

export function useJournalProgram() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => getJournalProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getJournalProgram(provider, programId), [provider, programId])

  const accounts = useQuery({
    queryKey: ['journal', 'all', { cluster }],
    queryFn: async () => {
      console.log('Fetching journal accounts...');
      const result = await program.account.journalEntryState.all();
      console.log('Journal accounts result:', result);
      return result;
    },
  })

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })

  const createEntry = useMutation<string, Error, EntryArgs>({
    mutationKey: ['journal', 'create', { cluster }],
    // mutationFn: (keypair: Keypair) => this would automatically generate the keypair from the app
    // but we want to use a connected wallet keypair here:
    mutationFn: async ({title, message, owner}) => {
      console.log("here?")
      console.log(owner.toString())
      const journalEntryAddress = PublicKey.findProgramAddressSync(
        // Here we derive the address of the journal entry data account like in lib.rs from title and owner key
        [Buffer.from(title), owner.toBuffer()], programId,
      );
      console.log('Journal entry address:', journalEntryAddress.toString());
      console.log('Program ID:', programId.toString());
      return program.methods.createEntry(title, message).accounts({journalEntry: journalEntryAddress}).rpc()
    },

    onSuccess: signature => {
      transactionToast(signature)
      return accounts.refetch()
    },

    onError: () => toast.error('Failed to initialize account'),
  })

  return {
    program,
    programId,
    accounts,
    getProgramAccount,
    createEntry,
  }
}

export function useJournalProgramAccount({ account }: { account: PublicKey }) {
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const { program, accounts, programId } = useJournalProgram()

  const accountQuery = useQuery({
    queryKey: ['journal', 'fetch', { cluster, account }],
    queryFn: () => program.account.journalEntryState.fetch(account),
  })

  const updateEntry = useMutation<string, Error, EntryArgs>({
    mutationKey: ['journal', 'update', { cluster }],
    // mutationFn: (keypair: Keypair) => this would automatically generate the keypair from the app
    // but we want to use a connected wallet keypair here:
    mutationFn: async ({title, message, owner}) => {
      const journalEntryAddress = await PublicKey.findProgramAddress(
        // Here we derive the address of the journal entry data account like in lib.rs from title and owner key
        [Buffer.from(title), owner.toBuffer()], programId,
      );
      return program.methods.updateEntry(title, message).accounts({journalEntry: journalEntryAddress}).rpc()
    },

    onSuccess: signature => {
      transactionToast(signature)
      return accounts.refetch()
    },

    onError: () => toast.error('Failed to initialize account'),
  })

  const deleteEntry = useMutation({
    mutationKey: ['journal', 'delete', { cluster, account }],
    mutationFn: (title: string) => program.methods.deleteEntry(title).accounts({journalEntry: account}).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return accounts.refetch()
    },
  })

  return {
    accountQuery,
    updateEntry,
    deleteEntry,
  }
}
