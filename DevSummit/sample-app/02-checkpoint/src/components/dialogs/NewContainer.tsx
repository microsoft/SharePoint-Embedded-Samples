import React, { useEffect, useState } from 'react';
import {
  Button, Input, Spinner,
  Dialog, DialogActions, DialogContent, DialogBody, DialogSurface, DialogTitle,
  makeStyles
} from "@fluentui/react-components";

const useStyles = makeStyles({
  containerSelectorControls: {
    width: '400px',
  },
  dialogContent: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: '10px',
    marginBottom: '25px'
  },
  button:{
    width: '250px',
  }
});

export interface IDialogCreateContainerProps {
  isOpen: boolean;
  isCreatingContainer: boolean;
  onCreateContainer?: (containerName: string, containerDescription: string) => void;
  onClose?: () => void;
}

export const DialogCreateContainer = (props: IDialogCreateContainerProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const onContainerCreateClick = async () => {
    if (props.onCreateContainer) {
      props.onCreateContainer(name, description);
    }
  };

  useEffect(() => {
    // reset form
    setName('');
    setDescription('');
  }, [props.isOpen]);

  const submitButtonIcon = (props.isCreatingContainer) ? <Spinner size='tiny' /> : null;

  const styles = useStyles();

  return (
    <Dialog open={props.isOpen} modalType='modal'>

      <DialogSurface>
        <DialogBody>
          <DialogTitle>Create a new storage Container</DialogTitle>

          <DialogContent className={styles.dialogContent}>
            <Input
              autoFocus required
              placeholder='Enter a name for the new container'
              className={styles.containerSelectorControls}
              disabled={props.isCreatingContainer}
              value={name}
              onChange={(e, d) => { setName(d.value); }} />
            <Input
              required
              placeholder='Enter a description for the new container'
              className={styles.containerSelectorControls}
              disabled={props.isCreatingContainer}
              value={description}
              onChange={(e, d) => { setDescription(d.value); }} />
          </DialogContent>

          <DialogActions>
            <Button
              appearance="secondary"
              disabled={props.isCreatingContainer}
              onClick={() => { if (props.onClose) { props.onClose(); } }}>Cancel</Button>
            <Button
              appearance="primary"
              className={styles.button}
              disabled={props.isCreatingContainer || (name === '')}
              icon={submitButtonIcon}
              value={name}
              onClick={onContainerCreateClick}>Create storage Container</Button>
          </DialogActions>

        </DialogBody>
      </DialogSurface>

    </Dialog>
  )
}
