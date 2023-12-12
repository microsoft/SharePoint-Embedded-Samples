import React, { useEffect, useState } from 'react';
import { useBoolean } from '@fluentui/react-hooks';
import { DefaultButton, Dialog, DialogType, DialogFooter, Dropdown, PrimaryButton, Stack, TextField, Spinner } from '@fluentui/react';
import RaaS from '../services/raas';
import Files from './files';
const raas = new RaaS();

const Containers = (props) => {
  const [containers, setContainers] = useState([]);
  const [selectedContainer, setSelectedContainer] = useState();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hideDialog, { toggle: toggleHideDialog }] = useBoolean(true);
  const [creatingContainer, setCreatingContainer] = useState(false);
  const [hidePermissions, setHidePermissions] = useState(false);

  useEffect(async () => {
    await loadContainers();
  }, []);

  const onContainerDropdownChange = (e, n) => {
    const selected = containers.find((c) => c.id === n.key);
    setSelectedContainer(selected);
  };
  const onNameChange = (e, nameText) => { setName(nameText || '') };
  const onDescriptionChange = (e, descriptionText) => { setDescription(descriptionText || '') };
  const createContainer = async () => {
    console.log(`Creating container with name=${name} and description=${description}`);
    setCreatingContainer(true);
    const container = await raas.createContainer(name, description);
    if (container) {
      setCreatingContainer(false);
      setName('');
      setDescription('');
      setContainers(current => [...current, container]);
      setSelectedContainer(container);
      toggleHideDialog();
    } else {
      setCreatingContainer(false);
      setName('');
      setDescription('');
    }
  };

  const loadContainers = async () => {
    const containers = await raas.listContainers();
    setContainers(containers.value);
  }

  const dialogContentProps = {
    type: DialogType.largeHeader,
    title: 'Create a new storage container',
  };

  return (
    <div align="center">
      <Stack
        horizontalAlign="center"
        verticalAlign="end"
        tokens={{ childrenGap: 20, padding: "20px" }}
        horizontal
      >
        <Dropdown
          placeholder="Select a Storage Container"
          label="Select a Storage Container"
          style={{ width: "400px", }}
          selectedKey={selectedContainer ? selectedContainer.id : undefined}
          options={containers.map((c) => {
            return {
              key: c.id,
              text: c.displayName
            }
          })}
          onChange={onContainerDropdownChange}
        />
        <PrimaryButton secondaryText="Create a new storage container" onClick={toggleHideDialog} text="New Container" style={{ display: "inline-block" }} />
      </Stack>
      <Dialog
        hidden={hideDialog}
        onDismiss={toggleHideDialog}
        dialogContentProps={dialogContentProps}
      >
        {creatingContainer && (
          <div>
            <Spinner label="Creating container..." />
          </div>
        )}
        <TextField label="Name" required value={name} onChange={onNameChange} />
        <TextField label="Description" multiline resizable={false} value={description} onChange={onDescriptionChange} />
        <DialogFooter>
          <PrimaryButton onClick={createContainer} text="Create" />
          <DefaultButton onClick={toggleHideDialog} text="Cancel" />
        </DialogFooter>
      </Dialog>
      {selectedContainer && (
        <>
          <Files container={selectedContainer} onContainerChange={onContainerDropdownChange} />
        </>
      )}
    </div>
  );
};

export default Containers;
