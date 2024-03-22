import React, { useEffect, useState } from 'react';
import {
  Button, Dropdown, Option, Text,
  makeStyles, shorthands
} from '@fluentui/react-components';
import type {
  OptionOnSelectData,
  SelectionEvents
} from '@fluentui/react-combobox'
import {
  DatabaseSearchRegular,
  NewFilled
} from '@fluentui/react-icons';
import { IContainer } from "../common";
import * as MOCKS from "../mock-data";
import { Container } from './Container';
import {
  DialogCreateContainer,
  DialogSearch
} from "./dialogs";

import SpEmbedded from '../services/spembedded';
const spe = new SpEmbedded();

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.padding('25px'),
  },
  containerSelector: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    rowGap: '10px',
    ...shorthands.padding('25px'),
  },
  containerSelectorControls: {
    width: '400px',
  },
  dialogContent: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: '10px',
    marginBottom: '25px'
  }
});

export const Containers = (props: any) => {
  const [containers, setContainers] = useState<IContainer[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<IContainer | undefined>(undefined);
  const [selectedContainerValue, setSelectedContainerValue] = useState<string>('');

  const [isContainerDialogOpen, setIsContainerDialogOpen] = useState(false);
  const [isCreatingContainer, setIsCreatingContainer] = useState(false);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const containers = await spe.listContainers();
      if (containers) {
        setContainers(containers);
      }
    })();
  }, []);

  useEffect(() => {
    setSelectedContainerValue(selectedContainer?.displayName || '');
  }, [selectedContainer]);

  const onContainerDropdownChange = (event: SelectionEvents, data: OptionOnSelectData) => {
    const selected = containers.find((container) => container.id === data.optionValue);
    setSelectedContainer(selected);
  };

  const onCreateContainer = async (containerName: string, containerDescription: string) => {
    setIsCreatingContainer(true);

    const newContainer = await spe.createContainer(containerName, containerDescription);

    if (newContainer) {
      setContainers(current => [...current, newContainer]);
      setSelectedContainer(newContainer);
    }

    setIsCreatingContainer(false);
    setIsContainerDialogOpen(false);
  };

  const styles = useStyles();

  return (
    <div className={styles.root}>
      <div className={styles.containerSelector}>
        <Text size={600} weight='bold'>Select a Container to view contents</Text>
        <Dropdown
          placeholder="Select an existing storage Container"
          className={styles.containerSelectorControls}
          selectedOptions={[selectedContainer?.id as string]}
          value={selectedContainerValue}
          onOptionSelect={onContainerDropdownChange}>
          {containers.map((option) => (
            <Option key={option.id} value={option.id}>{option.displayName}</Option>
          ))}
        </Dropdown>

        <Button
          appearance='primary'
          className={styles.containerSelectorControls}
          icon={<NewFilled />}
          onClick={() => { setIsContainerDialogOpen(true); }}>
            Create a new storage Container</Button>
        <DialogCreateContainer
          isOpen={isContainerDialogOpen}
          isCreatingContainer={isCreatingContainer}
          onCreateContainer={onCreateContainer}
          onClose={() => setIsContainerDialogOpen(false)} />

        <Button
          appearance='secondary'
          icon={<DatabaseSearchRegular />}
          onClick={() => { setIsSearchDialogOpen(true); }}>
          Search Containers &amp; Content
        </Button>
        <DialogSearch
          isOpen={isSearchDialogOpen}
          filterByContainerId={selectedContainer?.id}
          onClose={(containerId) => {
            if (containerId) {
              setSelectedContainer(containers.find((container) => container.id === containerId) as IContainer);
            }
            setIsSearchDialogOpen(false);
          }} />
      </div>
      {selectedContainer && (<Container container={selectedContainer} />)}
    </div>
  );
}

export default Containers;
