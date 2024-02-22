/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useState } from 'react';
import {
    Button,
    Dialog, DialogActions, DialogContent, DialogSurface, DialogBody, DialogTitle, DialogTrigger,
    Dropdown, Option,
    Input, InputProps, InputOnChangeData,
    Label,
    Spinner,
    makeStyles, shorthands, useId
} from '@fluentui/react-components';
import type {
    OptionOnSelectData,
    SelectionEvents
} from '@fluentui/react-combobox'
import { IContainer } from "./../common/IContainer";
import SpEmbedded from '../services/spembedded';
import type { DropdownProps } from "@fluentui/react-components";
import { Files } from "./files";

const SpEmbeddedConst = new SpEmbedded();

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
    const containerSelector = useId('containerSelector');

    const [dialogOpen, setDialogOpen] = useState(false);
    const containerName = useId('containerName');
    const [name, setName] = useState('');
    const containerDescription = useId('containerDescription');
    const [description, setDescription] = useState('');
    const [creatingContainer, setCreatingContainer] = useState(false);
    // BOOKMARK 1 - constants & hooks
    useEffect(() => {
        (async () => {
            const containers = await SpEmbeddedConst.listContainers();
            if (containers) {
                setContainers(containers);
            }
        })();
    }, []);
    const handleNameChange: InputProps["onChange"] = (event: React.ChangeEvent<HTMLInputElement>, data: InputOnChangeData): void => {
        setName(data?.value);
    };

    const handleDescriptionChange: InputProps["onChange"] = (event: React.ChangeEvent<HTMLInputElement>, data: InputOnChangeData): void => {
        setDescription(data?.value);
    };

    const onContainerCreateClick = async (event: React.MouseEvent<HTMLButtonElement>): Promise<void> => {
        setCreatingContainer(true);
        const newContainer = await SpEmbeddedConst.createContainer(name, description);

        if (newContainer) {
            setName('');
            setDescription('');
            setContainers(current => [...current, newContainer]);
            setSelectedContainer(newContainer);
            setDialogOpen(false);
        } else {
            setName('');
            setDescription('');
        }
        setCreatingContainer(false);
    }
    // BOOKMARK 2 - handlers go here
    const onContainerDropdownChange = (selectedOption: any, data: OptionOnSelectData) => {
        const selected = containers.find((container) => container.id === data.optionValue);
        setSelectedContainer(selected);
        console.log(selectedOption);
    };

    const styles = useStyles();
    // BOOKMARK 3 - component rendering
    return (
        <div className={styles.root}>
            <div className={styles.containerSelector}>
                <Dropdown
                    id={containerSelector}
                    placeholder="Select a Storage Container"
                    className={styles.containerSelectorControls}
                    onOptionSelect={onContainerDropdownChange}>
                    {containers.map((option) => (
                        <Option key={option.id} value={option.id}>{option.displayName}</Option>
                    ))}
                </Dropdown>
                <Dialog open={dialogOpen} onOpenChange={(event, data) => setDialogOpen(data.open)}>

                    <DialogTrigger disableButtonEnhancement>
                        <Button className={styles.containerSelectorControls} appearance='primary'>Create a new storage Container</Button>
                    </DialogTrigger>

                    <DialogSurface>
                        <DialogBody>
                            <DialogTitle>Create a new storage Container</DialogTitle>

                            <DialogContent className={styles.dialogContent}>
                                <Label htmlFor={containerName}>Container name:</Label>
                                <Input id={containerName} className={styles.containerSelectorControls} autoFocus required
                                    value={name} onChange={handleNameChange}></Input>
                                <Label htmlFor={containerDescription}>Container description:</Label>
                                <Input id={containerDescription} className={styles.containerSelectorControls} autoFocus required
                                    value={description} onChange={handleDescriptionChange}></Input>
                                {creatingContainer &&
                                    <Spinner size='medium' label='Creating storage Container...' labelPosition='after' />
                                }
                            </DialogContent>

                            <DialogActions>
                                <DialogTrigger disableButtonEnhancement>
                                    <Button appearance="secondary" disabled={creatingContainer}>Cancel</Button>
                                </DialogTrigger>
                                <Button appearance="primary"
                                    value={name}
                                    onClick={onContainerCreateClick}
                                    disabled={creatingContainer || (name === '')}>Create storage Container</Button>
                            </DialogActions>
                        </DialogBody>
                    </DialogSurface>

                </Dialog>
            </div>
            {selectedContainer && (<Files container={selectedContainer} />)}
        </div>
    );
}

export default Containers;