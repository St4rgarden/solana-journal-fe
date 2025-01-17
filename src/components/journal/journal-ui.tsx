'use client'

import { PublicKey } from '@solana/web3.js'
import { useState } from 'react'
import { ellipsify } from '../ui/ui-layout'
import { ExplorerLink } from '../cluster/cluster-ui'
import { useJournalProgram, useJournalProgramAccount } from './journal-data-access'
import { useWallet } from '@solana/wallet-adapter-react'

export function JournalCreate() {
  const { createEntry } = useJournalProgram();
  const { publicKey } = useWallet();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const isFormValid = title.trim() !== '' && message.trim() !== '';

  const handleSubmit = () => {
    if (publicKey && isFormValid) {
      createEntry.mutateAsync({title, message, owner: publicKey})
    }
  };

  if (!publicKey) {
    return <p> Connect your wallet </p>
  }

  return (
    <div className="w-full flex justify-center">
      <div className="flex flex-col space-y-4 max-w-xs w-full">
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input input-bordered w-full"
        />
        <textarea
          placeholder="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="textarea textarea-bordered w-full"
        />
        <button
          className="btn btn-xs lg:btn-md btn-primary"
          onClick={handleSubmit}
          disabled={createEntry.isPending || !isFormValid || !publicKey}
        >
          Create {createEntry.isPending && '...'}
        </button>
      </div>
    </div>
  )
}

export function JournalList() {
  const { accounts, getProgramAccount } = useJournalProgram()

  console.log('Accounts query state:', {
    isLoading: accounts.isLoading,
    isError: accounts.isError,
    data: accounts.data,
    error: accounts.error
  });

  if (getProgramAccount.isLoading) {
    return <span className="loading loading-spinner loading-lg"></span>
  }
  
  if (!getProgramAccount.data?.value) {
    return (
      <div className="alert alert-info flex justify-center">
        <span>Program account not found. Make sure you have deployed the program and are on the correct cluster.</span>
      </div>
    )
  }

  if (accounts.isLoading) {
    return <span className="loading loading-spinner loading-lg"></span>
  }

  if (accounts.isError) {
    return <div className="alert alert-error">Error loading accounts: {accounts.error?.message}</div>
  }

  if (!accounts.data?.length) {
    return (
      <div className="text-center">
        <h2 className={'text-2xl'}>No accounts</h2>
        No accounts found. Create one above to get started.
      </div>
    )
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {accounts.data.map((account) => (
        <JournalCard key={account.publicKey.toString()} account={account.publicKey} />
      ))}
    </div>
  )
}

function JournalCard({ account }: { account: PublicKey }) {
  const { accountQuery, updateEntry, deleteEntry } = useJournalProgramAccount({
    account,
  });
  const { publicKey } = useWallet();
  const [message, setMessage] = useState('');

  // Add debug logging
  console.log('Account Query Data:', accountQuery.data);

  if (accountQuery.isLoading) {
    return <span className="loading loading-spinner loading-lg"></span>
  }

  if (!accountQuery.data) {
    return null;
  }

  return (
    <div className="card card-bordered border-base-300 border-4 text-neutral-content">
      <div className="card-body items-center text-center">
        <div className="space-y-6">
          <h2 className="card-title justify-center text-3xl cursor-pointer" onClick={() => accountQuery.refetch()}>
            {accountQuery.data.title}
          </h2>
          <p>{accountQuery.data.message}</p>
          <div className="card-actions justify-around">
            <textarea
              placeholder="New Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="textarea textarea-bordered w-full max-w-xs"
            />
            <button
              className="btn btn-xs lg:btn-md btn-primary"
              onClick={() => {
                if (publicKey && message.trim() && accountQuery.data?.title) {
                  updateEntry.mutateAsync({
                    title: accountQuery.data.title,
                    message,
                    owner: publicKey
                  })
                }
              }}
              disabled={updateEntry.isPending || !message.trim() || !publicKey}
            >
              Update
            </button>
          </div>
          <div className="text-center space-y-4">
            <p>
              <ExplorerLink path={`account/${account}`} label={ellipsify(account.toString())} />
            </p>
            <button
              className="btn btn-xs btn-secondary btn-outline"
              onClick={() => {
                if (!window.confirm('Are you sure you want to delete this entry?')) {
                  return
                }
                const title = accountQuery.data?.title;
                if (title) {
                  return deleteEntry.mutateAsync(title)
                }
              }}
              disabled={deleteEntry.isPending}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
